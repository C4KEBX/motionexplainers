import { parseFacts } from "../schema/facts";
import { parseStoryboard, type Storyboard } from "../schema/storyboard";
import type { WordTiming } from "../schema/timing";
import {
  assertCuesSupported,
  assertFactsTraceable,
  assertHeadlinesFit,
  assertVariety,
} from "../schema/validate";
import { assertChartTiming } from "./assertChartTiming";
import { composeScenes, type ComposedScene } from "./resolveScene";

export type BuiltVideo = { storyboard: Storyboard; scenes: ComposedScene[]; totalFrames: number };

/** The single path from raw JSON to renderable scenes: parse, validate, compose. */
export function buildVideo(
  storyboardJson: unknown,
  factsJson: unknown,
  wordsFor: (sb: Storyboard) => Record<string, readonly WordTiming[]>,
  fps: number,
): BuiltVideo {
  const storyboard = parseStoryboard(storyboardJson);
  assertVariety(storyboard);
  assertCuesSupported(storyboard);
  assertHeadlinesFit(storyboard);
  assertFactsTraceable(storyboard, parseFacts(factsJson));
  const scenes = composeScenes(storyboard, wordsFor(storyboard), fps);
  assertChartTiming(scenes);
  const totalFrames = scenes.reduce((sum, scene) => sum + scene.durationFrames, 0);
  return { storyboard, scenes, totalFrames };
}
