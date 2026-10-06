import { EXIT_FRAMES, LINE_DRAW, RACE_RUN, lineDrawFrames, raceRunFrames } from "../charts/timing";
import { StoryboardError } from "../schema/storyboard";
import type { ComposedScene } from "./resolveScene";

/** A chart scene must finish animating before its exit fade, or its callouts and final value are lost. */
export function assertChartTiming(scenes: readonly ComposedScene[]): void {
  for (const composed of scenes) {
    const limit = composed.durationFrames - EXIT_FRAMES;
    const { scene } = composed;
    if (scene.type === "line-chart" && LINE_DRAW.start + lineDrawFrames(composed.durationFrames) > limit) {
      throw new StoryboardError(
        `Scene "${scene.id}" is too short (${composed.durationFrames} frames): the line chart cannot finish drawing before the scene exits; lengthen the narration`,
      );
    }
    if (scene.type === "bar-race" && RACE_RUN.start + raceRunFrames(composed.durationFrames) > limit) {
      throw new StoryboardError(
        `Scene "${scene.id}" is too short (${composed.durationFrames} frames): the bar race cannot finish before the scene exits; lengthen the narration`,
      );
    }
  }
}
