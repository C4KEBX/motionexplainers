import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const DOTS = Array.from({ length: 60 }, (_, i) => i);

export const RenderStress: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#15133b" }}>
      <svg width={width} height={height}>
        {DOTS.map((i) => {
          const p = spring({ frame: frame - i * 2, fps, config: { damping: 12 } });
          const x = (i % 6) * 170 + 120;
          const y = Math.floor(i / 6) * 150 + 300 + Math.sin((frame + i * 5) / 15) * 30;
          return <circle key={i} cx={x} cy={y} r={20 + p * 30} fill={i % 2 ? "#ff5d5d" : "#ffd23f"} />;
        })}
        <path
          d="M60 1600 C 300 1200, 700 1900, 1020 1300"
          stroke="#2ee59d"
          strokeWidth={24}
          fill="none"
          strokeDasharray={1400}
          strokeDashoffset={interpolate(frame, [0, 240], [1400, 0], { extrapolateRight: "clamp" })}
        />
      </svg>
      <div style={{ position: "absolute", top: 120, left: 60, fontSize: 140, fontWeight: 900, color: "#fff7e8" }}>
        Render test
      </div>
    </AbsoluteFill>
  );
};
