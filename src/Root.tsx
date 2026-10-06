import React from "react";
import { Composition } from "remotion";
import financeFacts from "../fixtures/finance.facts.json";
import financeStoryboard from "../fixtures/finance.storyboard.json";
import facts from "../fixtures/hello.facts.json";
import storyboardJson from "../fixtures/hello.storyboard.json";
import words from "../fixtures/hello.words.json";
import { synthWords } from "../fixtures/synthWords";
import { Video } from "./compose/Video";
import { VIDEO } from "./design/tokens";
import { buildVideo } from "./pipeline/buildVideo";
import { RenderStress } from "./spikes/RenderStress";

const hello = buildVideo(storyboardJson, facts, () => words, VIDEO.fps);
const finance = buildVideo(
  financeStoryboard,
  financeFacts,
  (sb) => Object.fromEntries(sb.scenes.map((s) => [s.id, synthWords(s.narration)])),
  VIDEO.fps,
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="HelloBigNumber"
      component={Video}
      durationInFrames={hello.totalFrames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={{ scenes: hello.scenes }}
    />
    <Composition
      id="FinanceDemo"
      component={Video}
      durationInFrames={finance.totalFrames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={{ scenes: finance.scenes }}
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
