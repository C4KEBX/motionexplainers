import dns from "node:dns";
import type { Facts } from "../schema/facts";
import type { VerifyResult } from "./verifyTypes";

type Fact = Facts["facts"][number];
type FetchLike = typeof fetch;

const MAX_BODY_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 15_000;
const TEXT_TYPES = /^(text\/html|text\/plain|application\/json|application\/xhtml\+xml)/i;
const SUPPORTED_AT = 0.6;

function ipv4Octets(host: string): number[] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  return m ? m.slice(1).map(Number) : null;
}

function blockedIpv4([a, b]: number[]): boolean {
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19))
  );
}

/** IPv4 hidden inside an IPv6 literal (::ffff:a.b.c.d, ::a.b.c.d, 64:ff9b::a.b.c.d), in dotted or two-hextet form. */
function embeddedIpv4(host: string): number[] | null {
  const m = host.match(/^(?:::ffff:|::|64:ff9b::)(?:(\d{1,3}(?:\.\d{1,3}){3})|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
  if (!m) return null;
  if (m[1]) return ipv4Octets(m[1]);
  const hi = parseInt(m[2], 16);
  const lo = parseInt(m[3], 16);
  return [hi >> 8, hi & 255, lo >> 8, lo & 255];
}

/** True for an IP literal (as the URL parser prints it, or as DNS returns it) in a range the verifier must never contact. */
export function isBlockedAddress(raw: string): boolean {
  const host = raw.toLowerCase().replace(/^\[|\]$/g, "");
  if (host.includes(":")) {
    const inner = embeddedIpv4(host);
    if (inner) return blockedIpv4(inner);
    return host === "::1" || host === "::" || /^f[cd]/.test(host) || /^fe[89ab]/.test(host) || /^ff/.test(host);
  }
  const o = ipv4Octets(host);
  return o !== null && blockedIpv4(o);
}

const hostnameOf = (url: URL): string => url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/, "");
const isIpLiteral = (host: string): boolean => host.includes(":") || ipv4Octets(host) !== null;

/** True for URLs the verifier must never fetch: non-web schemes, local names, and private/loopback/link-local addresses. DNS names are checked separately by resolving them. */
export function isBlockedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return true;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  const host = hostnameOf(url);
  if (host === "localhost" || /\.(localhost|local|internal)$/.test(host) || host.endsWith(".home.arpa")) return true;
  return isBlockedAddress(host);
}

export type Resolver = (host: string) => Promise<string[]>;
const lookupAll: Resolver = async (host) => (await dns.promises.lookup(host, { all: true, verbatim: true })).map((a) => a.address);

function collectNumbers(value: unknown, out: number[]): void {
  if (typeof value === "number" && Number.isFinite(value)) out.push(Math.abs(value));
  else if (Array.isArray(value)) value.forEach((v) => collectNumbers(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectNumbers(v, out));
}

const withCommas = (n: number): string => n.toLocaleString("en-US", { maximumFractionDigits: 10 });

/** Number strings a page should contain if it backs the fact. */
export function factTokens(fact: Fact): string[] {
  const numbers: number[] = [];
  if (fact.value !== undefined) numbers.push(Math.abs(fact.value));
  collectNumbers(fact.dataset, numbers);
  const tokens = new Set<string>();
  for (const n of numbers) {
    tokens.add(String(n));
    if (Math.abs(n) >= 1000) tokens.add(withCommas(n));
  }
  return [...tokens];
}

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);/g, (e) => ENTITIES[e] ?? e)
    .replace(/\s+/g, " ")
    .trim();
}

/** One entry per number: the plain form, satisfied by it or by its thousands-separated twin. */
function tokenGroups(tokens: readonly string[]): { token: string; variants: string[] }[] {
  return tokens
    .filter((t) => !t.includes(","))
    .map((token) => ({ token, variants: [token, ...tokens.filter((c) => c.includes(",") && c.replace(/,/g, "") === token)] }));
}

const hasToken = (text: string, token: string): boolean =>
  new RegExp(`(?<![\\d.,])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d])`).test(text);

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return (await response.text()).slice(0, MAX_BODY_BYTES);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BODY_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => undefined);
  return new TextDecoder().decode(Buffer.concat(chunks)).slice(0, MAX_BODY_BYTES);
}

export async function verifyFact(
  fact: Fact,
  fetchImpl: FetchLike = fetch,
  opts: { timeoutMs?: number; resolve?: Resolver } = {},
): Promise<VerifyResult> {
  const base = { factId: fact.id, url: fact.source.url, found: [] as string[], missing: [] as string[] };
  const tokens = factTokens(fact);
  let url = fact.source.url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      if (isBlockedUrl(url)) return { ...base, status: "blocked", detail: `refusing to fetch ${url}` };
      const host = hostnameOf(new URL(url));
      if (!isIpLiteral(host)) {
        const addresses = await (opts.resolve ?? lookupAll)(host);
        const bad = addresses.find(isBlockedAddress);
        if (bad) return { ...base, status: "blocked", detail: `${host} resolves to ${bad}` };
      }
      const response = await fetchImpl(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": "motion-explainers-fact-check/1.0", accept: "text/html,text/plain,application/json" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return { ...base, status: "unreachable", detail: "redirect without a location" };
        url = new URL(location, url).toString();
        continue;
      }
      if (response.status < 200 || response.status >= 300) return { ...base, status: "unreachable", detail: `HTTP ${response.status}` };
      if (!TEXT_TYPES.test(response.headers.get("content-type") ?? "")) {
        return { ...base, status: "unreachable", detail: `content type ${response.headers.get("content-type") ?? "unknown"} is not checkable text` };
      }
      if (tokens.length === 0) return { ...base, status: "partial", detail: "nothing numeric to check; read the source yourself" };
      const text = htmlToText(await readCapped(response));
      const groups = tokenGroups(tokens);
      const found = groups.filter((g) => g.variants.some((v) => hasToken(text, v))).map((g) => g.token);
      const missing = groups.map((g) => g.token).filter((t) => !found.includes(t));
      const coverage = found.length / groups.length;
      const status = coverage === 1 ? "supported" : coverage >= SUPPORTED_AT ? "partial" : "not-found";
      return { ...base, status, found, missing };
    }
    return { ...base, status: "unreachable", detail: "too many redirects" };
  } catch (error) {
    return { ...base, status: "unreachable", detail: (error as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

/** Sequential on purpose: polite to the sources. */
export async function verifyFacts(facts: Facts, fetchImpl: FetchLike = fetch, opts: { resolve?: Resolver } = {}): Promise<VerifyResult[]> {
  const results: VerifyResult[] = [];
  for (const fact of facts.facts) results.push(await verifyFact(fact, fetchImpl, opts));
  return results;
}
