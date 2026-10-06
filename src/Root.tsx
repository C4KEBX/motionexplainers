import React from "react";
import { Composition } from "remotion";
import facts from "../fixtures/hello.facts.json";
import storyboardJson from "../fixtures/hello.storyboard.json";
import words from "../fixtures/hello.words.json";
import { Video } from "./compose/Video";
import { VIDEO } from "./design/tokens";
import { composeScenes } from "./pipeline/resolveScene";
import { parseFacts } from "./schema/facts";
import { parseStoryboard } from "./schema/storyboard";
import { assertCuesSupported, assertFactsTraceable, assertHeadlinesFit, assertVariety } from "./schema/validate";
import { RenderStress } from "./spikes/RenderStress";

const storyboard = parseStoryboard(storyboardJson);
assertVariety(storyboard);
assertCuesSupported(storyboard);
assertHeadlinesFit(storyboard);
assertFactsTraceable(storyboard, parseFacts(facts));
const helloScenes = composeScenes(storyboard, words, VIDEO.fps);
const helloFrames = helloScenes.reduce((sum, s) => sum + s.durationFrames, 0);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="HelloBigNumber"
      component={Video}
      durationInFrames={helloFrames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={{ scenes: helloScenes }}
    />
    <Composition
      id="RenderStress"
      component={RenderStress}
      durationInFrames={300}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  </>
);
