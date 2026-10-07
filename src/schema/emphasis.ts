import { normalizeWord } from "./timing";

export type EmphasisTarget = { line: number; word: number };

/** The on-screen word an `emphasize` cue points at: the first word of the lines that matches `text`. */
export function emphasisTarget(lines: readonly string[], text: string): EmphasisTarget | null {
  const want = normalizeWord(text);
  if (want === "") return null;
  for (let line = 0; line < lines.length; line += 1) {
    const word = lines[line].split(/\s+/).filter(Boolean).findIndex((w) => normalizeWord(w) === want);
    if (word >= 0) return { line, word };
  }
  return null;
}
