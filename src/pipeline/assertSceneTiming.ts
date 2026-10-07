import { EXIT_FRAMES, RACE_RUN, drawPlan, raceRunFrames } from "../charts/timing";
import { kineticRevealFrames } from "../scenes/kinetic-text/timing";
import { compareRevealFrames } from "../scenes/compare/layout";
import { quoteRevealFrames } from "../scenes/quote/timing";
import { StoryboardError } from "../schema/storyboard";
import type { ComposedScene } from "./resolveScene";

/** A scene must finish animating before its exit fade, or its callouts and final value are lost. */
export function assertSceneTiming(scenes: readonly ComposedScene[]): void {
  for (const composed of scenes) {
    const limit = composed.durationFrames - EXIT_FRAMES;
    const { scene } = composed;
    if (scene.type === "line-chart") {
      const callouts = composed.cues
        .filter((c) => c.do === "callout" && c.x !== undefined)
        .map((c) => ({ frame: c.frame, x: c.x as number }));
      let end: number;
      try {
        const { knots } = drawPlan(callouts, scene.props.points, composed.durationFrames);
        end = knots[knots.length - 1].frame;
      } catch (error) {
        if (error instanceof RangeError) throw new StoryboardError(`Scene "${scene.id}": ${error.message}`);
        throw error;
      }
      if (end > limit) {
        throw new StoryboardError(
          `Scene "${scene.id}" is too short (${composed.durationFrames} frames): the line chart cannot finish drawing before the scene exits; lengthen the narration`,
        );
      }
    }
    if (scene.type === "kinetic-text" && kineticRevealFrames(scene.props.lines.length) > limit) {
      throw new StoryboardError(
        `Scene "${scene.id}" is too short (${composed.durationFrames} frames): the kinetic text cannot finish revealing before the scene exits; lengthen the narration`,
      );
    }
    if (scene.type === "compare" && compareRevealFrames() > limit) {
      throw new StoryboardError(
        `Scene "${scene.id}" is too short (${composed.durationFrames} frames): the compare values cannot finish counting up before the scene exits; lengthen the narration`,
      );
    }
    if (scene.type === "quote" && quoteRevealFrames(scene.props.quote.split(/\s+/).filter(Boolean).length) > limit) {
      throw new StoryboardError(
        `Scene "${scene.id}" is too short (${composed.durationFrames} frames): the quote cannot finish revealing before the scene exits; lengthen the narration`,
      );
    }
    if (scene.type === "bar-race" && RACE_RUN.start + raceRunFrames(composed.durationFrames) > limit) {
      throw new StoryboardError(
        `Scene "${scene.id}" is too short (${composed.durationFrames} frames): the bar race cannot finish before the scene exits; lengthen the narration`,
      );
    }
  }
}
