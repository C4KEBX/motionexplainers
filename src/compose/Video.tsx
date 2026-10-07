import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { Captions } from "../captions/Captions";
import type { CaptionChunk } from "../captions/chunk";
import type { ComposedScene } from "../pipeline/resolveScene";
import { BigNumber } from "../scenes/big-number/BigNumber";
import { BarRace } from "../scenes/bar-race/BarRace";
import { LineChart } from "../scenes/line-chart/LineChart";
import { Title } from "../scenes/title/Title";
import { PALETTE } from "../design/tokens";

const SceneSwitch: React.FC<{ composed: ComposedScene }> = ({ composed }) => {
  const { scene, cues, durationFrames } = composed;
  switch (scene.type) {
    case "title":
      return <Title props={scene.props} cues={cues} durationFrames={durationFrames} />;
    case "big-number":
      return <BigNumber props={scene.props} cues={cues} durationFrames={durationFrames} />;
    case "line-chart":
      return <LineChart props={scene.props} cues={cues} durationFrames={durationFrames} />;
    case "bar-race":
      return <BarRace props={scene.props} cues={cues} durationFrames={durationFrames} />;
    default: {
      const unreachable: never = scene;
      throw new Error(`Unhandled scene type: ${JSON.stringify(unreachable)}`);
    }
  }
};

export const Video: React.FC<{ scenes: ComposedScene[]; captions: CaptionChunk[]; totalFrames?: number }> = ({
  scenes,
  captions,
}) => (
  <AbsoluteFill style={{ background: PALETTE.ground }}>
    <Series>
      {scenes.map((composed) => (
        <Series.Sequence key={composed.id} durationInFrames={composed.durationFrames}>
          <SceneSwitch composed={composed} />
        </Series.Sequence>
      ))}
    </Series>
    <Captions chunks={captions} />
  </AbsoluteFill>
);
