import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { scaleLinear } from "d3-scale";
import { area as d3area, curveMonotoneX, line as d3line } from "d3-shape";
import { CalloutBadge } from "../../charts/CalloutBadge";
import {
  cursorX, decimalsForStep, niceTicks, pointOnPathAtX, valueAtX, yDomainAt,
  type DataPoint, type Domain,
} from "../../charts/geometry";
import { CHART_BOX, placeBadge, readoutFontSize } from "../../charts/layout";
import { EXIT_FRAMES, LINE_DRAW, calloutAppearFrame, lineDrawFrames } from "../../charts/timing";
import { BODY_FONT, DISPLAY_FONT } from "../../design/fonts";
import { formatNumber } from "../../design/layout";
import { dataProgress, popIn, staggerDelay, sustainDrift } from "../../design/motion";
import { PALETTE, SAFE, VIDEO } from "../../design/tokens";
import type { LineChartProps } from "../../schema/storyboard";
import type { SceneRenderProps } from "../types";

const LINE_WIDTH = 16;

export const LineChart: React.FC<SceneRenderProps<LineChartProps>> = ({ props, cues, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tone = PALETTE[props.tone];
  const { points } = props;

  const progress = dataProgress(frame, LINE_DRAW.start, lineDrawFrames(durationFrames));
  const cx = cursorX(points, progress);
  const xDomain: Domain = [points[0].x, points[points.length - 1].x];
  const yDomain = yDomainAt(points, progress, props.baseline);
  const sx = scaleLinear().domain([xDomain[0], xDomain[1]]).range([CHART_BOX.left, CHART_BOX.right]);
  const sy = scaleLinear().domain([yDomain[0], yDomain[1]]).range([CHART_BOX.bottom, CHART_BOX.top]);
  const toX = (d: DataPoint) => sx(d.x);
  const toY = (d: DataPoint) => sy(d.y);
  const linePath = d3line<DataPoint>().x(toX).y(toY).curve(curveMonotoneX)(points) ?? "";
  const zeroY = sy(Math.min(Math.max(0, yDomain[0]), yDomain[1]));
  const areaBase = props.baseline === "zero" ? zeroY : CHART_BOX.bottom;
  const areaPath = d3area<DataPoint>().x(toX).y0(areaBase).y1(toY).curve(curveMonotoneX)(points) ?? "";
  const tip = pointOnPathAtX(linePath, sx(cx));

  const fmt = (v: number, decimals: number) => `${props.prefix}${formatNumber(v, decimals)}${props.suffix}`;
  const readout = fmt(valueAtX(points, cx), props.decimals);
  const readoutSize = readoutFontSize(
    points.map((p) => p.y),
    (v) => fmt(v, props.decimals),
    VIDEO.width - 2 * SAFE.side,
    220,
  );

  const yTicks = niceTicks(yDomain, 4);
  const yTickDecimals = decimalsForStep(yTicks.length > 1 ? yTicks[1] - yTicks[0] : 1);
  const rawXTicks = niceTicks(xDomain, 5);
  const xTicks = props.xFormat === "year" ? rawXTicks.filter(Number.isInteger) : rawXTicks;
  const xTickDecimals =
    props.xFormat === "year" ? 0 : decimalsForStep(rawXTicks.length > 1 ? rawXTicks[1] - rawXTicks[0] : 1);
  const xLabel = (t: number) => (props.xFormat === "year" ? String(t) : formatNumber(t, xTickDecimals));

  const titleIn = Math.min(1, popIn(frame, fps, 0));
  const dotIn = Math.min(1, popIn(frame, fps, LINE_DRAW.start));
  const exit = interpolate(frame, [durationFrames - EXIT_FRAMES, durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: PALETTE.ground, opacity: exit }}>
      <div style={{ position: "absolute", left: SAFE.side, top: SAFE.top, width: VIDEO.width - 2 * SAFE.side }}>
        <div
          style={{
            fontFamily: BODY_FONT, fontSize: 52, color: PALETTE.ink, opacity: 0.85,
            transform: `scale(${titleIn})`, transformOrigin: "left center",
          }}
        >
          {props.title}
        </div>
        <div
          style={{
            fontFamily: DISPLAY_FONT, fontSize: readoutSize, lineHeight: 1.05, color: tone,
            fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", marginTop: 24,
          }}
        >
          {readout}
        </div>
      </div>

      <svg width={VIDEO.width} height={VIDEO.height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id="line-reveal">
            <rect x={0} y={0} width={sx(cx)} height={VIDEO.height} />
          </clipPath>
        </defs>

        {yTicks.map((t, i) => {
          const y = sy(t);
          const fade =
            Math.min(1, Math.max(0, (y - CHART_BOX.top) / 60)) * Math.min(1, popIn(frame, fps, staggerDelay(i, 3)));
          return (
            <g key={t} opacity={fade}>
              <line x1={CHART_BOX.left} x2={CHART_BOX.right} y1={y} y2={y} stroke={PALETTE.ink} strokeOpacity={0.14} strokeWidth={3} />
              <text x={CHART_BOX.left} y={y - 12} fontFamily={BODY_FONT} fontSize={38} fill={PALETTE.ink} fillOpacity={0.55}>
                {fmt(t, yTickDecimals)}
              </text>
            </g>
          );
        })}
        <line
          x1={CHART_BOX.left} x2={CHART_BOX.right} y1={CHART_BOX.bottom} y2={CHART_BOX.bottom}
          stroke={PALETTE.ink} strokeOpacity={0.35} strokeWidth={4}
        />
        {xTicks.map((t) => (
          <text
            key={t} x={sx(t)} y={CHART_BOX.bottom + 56} textAnchor="middle"
            fontFamily={BODY_FONT} fontSize={38} fill={PALETTE.ink} fillOpacity={0.55}
          >
            {xLabel(t)}
          </text>
        ))}

        {yDomain[0] < 0 && yDomain[1] > 0 && (
          <line
            x1={CHART_BOX.left} x2={CHART_BOX.right} y1={zeroY} y2={zeroY}
            stroke={PALETTE.ink} strokeOpacity={0.35} strokeWidth={4}
          />
        )}
        <g clipPath="url(#line-reveal)">
          <path d={areaPath} fill={tone} fillOpacity={0.2} />
          <path d={linePath} fill="none" stroke={tone} strokeWidth={LINE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <g transform={`translate(${tip.x} ${tip.y})`} opacity={dotIn}>
          <circle r={40 + sustainDrift(frame, 8, 30)} fill="none" stroke={tone} strokeWidth={8} strokeOpacity={0.5} />
          <circle r={24} fill={PALETTE.ink} />
          <circle r={11} fill={tone} />
        </g>

        {cues
          .filter((c) => c.do === "callout" && c.text !== undefined && c.x !== undefined)
          .map((c) => {
            const anchorXValue = c.x as number;
            const appear = calloutAppearFrame(c.frame, anchorXValue, points, durationFrames);
            if (frame < appear) return null;
            const ax = sx(anchorXValue);
            const ay = sy(valueAtX(points, anchorXValue));
            return (
              <CalloutBadge
                key={`${c.frame}-${c.x}`} badge={placeBadge(ax, ay, c.text as string)} text={c.text as string}
                anchorX={ax} anchorY={ay} scale={popIn(frame, fps, appear)} color={tone}
              />
            );
          })}
      </svg>
    </AbsoluteFill>
  );
};
