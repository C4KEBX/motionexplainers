import fs from "node:fs";
import path from "node:path";
import { renderStill, selectComposition } from "@remotion/renderer";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import facts from "../../fixtures/finance.facts.json";
import storyboard from "../../fixtures/finance.storyboard.json";
import { synthWords } from "../../fixtures/synthWords";
import { buildVideo } from "../../src/pipeline/buildVideo";
import { diffRatio } from "../../src/testing/imageDiff";
import { getServeUrl } from "../../src/testing/renderHelpers";

const GOLDEN_DIR = path.resolve("tests/render/golden");
const TMP_DIR = path.resolve("tests/render/_tmp");
const MAX_DIFF = 0.002;
const SETTLE_MARGIN = 10; // frames before the exit fade starts (it begins 8 frames before the end)

const built = buildVideo(
  storyboard, facts,
  (sb) => Object.fromEntries(sb.scenes.map((s) => [s.id, synthWords(s.narration)])),
  30,
);

// Two frames per chart scene: mid-animation and settled. Offsets come from the composed scenes.
const targets: { name: string; frame: number }[] = [];
let start = 0;
for (const scene of built.scenes) {
  if (scene.scene.type === "line-chart" || scene.scene.type === "bar-race") {
    targets.push({ name: `${scene.id}-mid`, frame: start + Math.round(scene.durationFrames * 0.45) });
    targets.push({ name: `${scene.id}-end`, frame: start + scene.durationFrames - SETTLE_MARGIN });
  }
  start += scene.durationFrames;
}

describe("FinanceDemo chart snapshots", () => {
  for (const { name, frame } of targets) {
    it(`${name} (frame ${frame}) matches the golden image`, async () => {
      fs.mkdirSync(GOLDEN_DIR, { recursive: true });
      fs.mkdirSync(TMP_DIR, { recursive: true });
      const serveUrl = await getServeUrl();
      const composition = await selectComposition({ serveUrl, id: "FinanceDemo" });
      const output = path.join(TMP_DIR, `finance-${name}.png`);
      await renderStill({ composition, serveUrl, output, frame });

      const golden = path.join(GOLDEN_DIR, `finance-${name}.png`);
      if (process.env.UPDATE_SNAPSHOTS === "1") {
        fs.copyFileSync(output, golden);
        return;
      }
      if (!fs.existsSync(golden)) {
        throw new Error(`Missing golden image ${golden}; run with UPDATE_SNAPSHOTS=1 and review it by eye`);
      }
      const ratio = diffRatio(PNG.sync.read(fs.readFileSync(output)), PNG.sync.read(fs.readFileSync(golden)));
      expect(ratio).toBeLessThanOrEqual(MAX_DIFF);
    });
  }
});
