import { dataFrameAt } from "../design/motion";
import type { DataPoint } from "./geometry";

/** Frames at the end of every scene used by the exit fade. */
export const EXIT_FRAMES = 8;

export const LINE_DRAW = { start: 14, share: 0.7, minFrames: 30 } as const;
export const RACE_RUN = { start: 10, share: 0.8, minFrames: 40 } as const;

export const lineDrawFrames = (durationFrames: number): number =>
  Math.max(LINE_DRAW.minFrames, Math.round(durationFrames * LINE_DRAW.share) - LINE_DRAW.start);

export const raceRunFrames = (durationFrames: number): number =>
  Math.max(RACE_RUN.minFrames, Math.round(durationFrames * RACE_RUN.share) - RACE_RUN.start);

/** The frame a line-chart callout appears: after its cue word and once the line has reached its x. */
export function calloutAppearFrame(
  cueFrame: number,
  anchorX: number,
  points: readonly DataPoint[],
  durationFrames: number,
): number {
  const first = points[0].x;
  const last = points[points.length - 1].x;
  const reach = dataFrameAt((anchorX - first) / (last - first), LINE_DRAW.start, lineDrawFrames(durationFrames));
  return Math.max(cueFrame, Math.ceil(reach));
}
