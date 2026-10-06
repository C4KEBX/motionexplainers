import type { WordTiming } from "../src/schema/timing";

/**
 * Synthetic word timings: a deterministic stand-in for TTS output so cues and scene durations can
 * be exercised without a voice. Each word lasts baseMs + msPerChar * length, separated by gapMs.
 * Replaced by the real voice step (and its number-splitting normalizer) in a later plan.
 */
export function synthWords(narration: string, msPerChar = 55, baseMs = 90, gapMs = 40): WordTiming[] {
  const tokens = narration.split(/\s+/).filter(Boolean);
  let cursor = 0;
  return tokens.map((text) => {
    const duration = baseMs + msPerChar * text.length;
    const word = { text, startMs: cursor, endMs: cursor + duration };
    cursor += duration + gapMs;
    return word;
  });
}
