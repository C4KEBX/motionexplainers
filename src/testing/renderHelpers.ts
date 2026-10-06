import path from "node:path";
import { bundle } from "@remotion/bundler";

let cached: Promise<string> | undefined;

/** Bundles the Remotion project once per test process. */
export function getServeUrl(): Promise<string> {
  cached ??= bundle({ entryPoint: path.resolve("src/index.ts") });
  return cached;
}
