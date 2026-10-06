import type { Scene, Storyboard } from "../schema/storyboard";
import {
  assertValidWords,
  CueResolutionError,
  msToFrame,
  resolveCue,
  sceneDurationMs,
  type WordTiming,
} from "../schema/timing";

export type ResolvedCue = { frame: number; do: "callout" | "emphasize"; text?: string };

export type ComposedScene = {
  id: string;
  scene: Scene;
  cues: ResolvedCue[];
  durationFrames: number;
};

export function composeScenes(
  sb: Storyboard,
  wordsByScene: Record<string, readonly WordTiming[]>,
  fps: number,
): ComposedScene[] {
  return sb.scenes.map((scene) => {
    const words = wordsByScene[scene.id];
    if (!words) throw new CueResolutionError(`No word timings for scene "${scene.id}"`);
    try {
      assertValidWords(words);
      const cues = scene.cues.map((cue) => ({
        frame: msToFrame(resolveCue(words, cue.atWord, cue.occurrence), fps),
        do: cue.do,
        text: cue.text,
      }));
      return { id: scene.id, scene, cues, durationFrames: msToFrame(sceneDurationMs(words), fps) };
    } catch (error) {
      if (error instanceof CueResolutionError) {
        throw new CueResolutionError(`Scene "${scene.id}": ${error.message}`);
      }
      throw error;
    }
  });
}
