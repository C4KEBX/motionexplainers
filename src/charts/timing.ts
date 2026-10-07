import type { DataPoint } from "./geometry";
import type { Knot } from "./schedule";

/** Frames at the end of every scene used by the exit fade. */
export const EXIT_FRAMES = 8;

export const LINE_DRAW = { start: 14, share: 0.7, minFrames: 30 } as const;
export const RACE_RUN = { start: 10, share: 0.8, minFrames: 40 } as const;

/** Least frames the line may spend travelling between two callouts (prevents a teleporting cursor). */
export const LINE_DRAW_MIN_SEGMENT = 6;

export const lineDrawFrames = (durationFrames: number): number =>
  Math.max(LINE_DRAW.minFrames, Math.round(durationFrames * LINE_DRAW.share) - LINE_DRAW.start);

export const raceRunFrames = (durationFrames: number): number =>
  Math.max(RACE_RUN.minFrames, Math.round(durationFrames * RACE_RUN.share) - RACE_RUN.start);

export type CalloutAnchor = { frame: number; x: number };
export type DrawPlan = { knots: Knot[]; appear: number[] };

/**
 * Pacing for a line draw: the cursor sits on each callout's x on the frame that callout appears,
 * which is its cue frame (pushed later only when the line could not otherwise get there without
 * jumping). `appear[i]` belongs to `callouts[i]`. Callouts must run left to right in spoken order.
 */
export function drawPlan(
  callouts: readonly CalloutAnchor[],
  points: readonly DataPoint[],
  durationFrames: number,
): DrawPlan {
  const first = points[0].x;
  const span = points[points.length - 1].x - first;
  const ordered = callouts
    .map((c, index) => ({ ...c, index }))
    .sort((a, b) => a.frame - b.frame || a.index - b.index);
  const knots: Knot[] = [{ frame: LINE_DRAW.start, progress: 0 }];
  const appear = new Array<number>(callouts.length);
  for (const c of ordered) {
    const prev = knots[knots.length - 1];
    const progress = (c.x - first) / span;
    if (progress < prev.progress) {
      throw new RangeError(`callout cues must run left to right in spoken order (x ${c.x} is spoken after a callout further right)`);
    }
    const frame = Math.max(c.frame, prev.frame + LINE_DRAW_MIN_SEGMENT);
    knots.push({ frame, progress });
    appear[c.index] = frame;
  }
  const last = knots[knots.length - 1];
  const defaultEnd = LINE_DRAW.start + lineDrawFrames(durationFrames);
  const tail = last.progress < 1 ? Math.max(defaultEnd, last.frame + LINE_DRAW_MIN_SEGMENT) : defaultEnd;
  if (tail > last.frame) knots.push({ frame: tail, progress: 1 });
  return { knots, appear };
}
