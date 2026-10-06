import { fitTitleFontSize, formatNumber } from "../design/layout";
import { TITLE_LANE } from "../design/tokens";
import type { Facts } from "./facts";
import { deepEqual } from "./deepEqual";
import { StoryboardError, type Scene, type Storyboard } from "./storyboard";

export const MIN_VIDEO_MS = 55_000;
export const MAX_VIDEO_MS = 60_000;

export function assertVariety(sb: Storyboard): void {
  for (let i = 2; i < sb.scenes.length; i += 1) {
    const [a, b, c] = [sb.scenes[i - 2], sb.scenes[i - 1], sb.scenes[i]];
    if (a.type === b.type && b.type === c.type) {
      throw new StoryboardError(
        `Scenes "${a.id}", "${b.id}", "${c.id}" are all "${a.type}"; vary the scene types`,
      );
    }
  }
}

type NumberScene = Extract<Scene, { type: "big-number" }>;
type ChartScene = Extract<Scene, { type: "line-chart" }>;
type RaceScene = Extract<Scene, { type: "bar-race" }>;
type Fact = Facts["facts"][number];

function assertNumberFact(scene: NumberScene, fact: Fact): void {
  if (fact.value === undefined) {
    throw new StoryboardError(
      `Scene "${scene.id}": fact "${fact.id}" has no value to verify the displayed number against`,
    );
  }
  if (fact.value !== scene.props.value) {
    throw new StoryboardError(
      `Scene "${scene.id}" shows ${scene.props.value} but fact "${fact.id}" says ${fact.value}`,
    );
  }
  const { value, decimals } = scene.props;
  const displayed = Number(formatNumber(value, decimals).replace(/,/g, ""));
  if (displayed !== value) {
    throw new StoryboardError(
      `Scene "${scene.id}" would display ${displayed} for value ${value} at ${decimals} decimals; use more decimals or a rounded fact`,
    );
  }
}

function assertLineChartFact(scene: ChartScene, fact: Fact): void {
  if (fact.dataset === undefined) {
    throw new StoryboardError(`Scene "${scene.id}": fact "${fact.id}" has no dataset to verify the chart against`);
  }
  if (!deepEqual(fact.dataset, scene.props.points)) {
    throw new StoryboardError(`Scene "${scene.id}": chart points do not match the dataset of fact "${fact.id}"`);
  }
  const last = scene.props.points[scene.props.points.length - 1].y;
  const displayed = Number(formatNumber(last, scene.props.decimals).replace(/,/g, ""));
  if (displayed !== last) {
    throw new StoryboardError(
      `Scene "${scene.id}" would display ${displayed} for the last value ${last} at ${scene.props.decimals} decimals; use more decimals`,
    );
  }
}

function assertBarRaceFact(scene: RaceScene, fact: Fact): void {
  if (fact.dataset === undefined) {
    throw new StoryboardError(`Scene "${scene.id}": fact "${fact.id}" has no dataset to verify the race against`);
  }
  if (!deepEqual(fact.dataset, scene.props.frames)) {
    throw new StoryboardError(`Scene "${scene.id}": race frames do not match the dataset of fact "${fact.id}"`);
  }
  const { decimals } = scene.props;
  for (const frame of scene.props.frames) {
    for (const { name, value } of frame.values) {
      const displayed = Number(formatNumber(value, decimals).replace(/,/g, ""));
      if (displayed !== value) {
        throw new StoryboardError(
          `Scene "${scene.id}" would display ${displayed} for value ${value} (${name}, ${frame.label}) at ${decimals} decimals; use more decimals`,
        );
      }
    }
  }
}

export function assertFactsTraceable(sb: Storyboard, facts: Facts): void {
  const byId = new Map(facts.facts.map((fact) => [fact.id, fact]));
  for (const scene of sb.scenes) {
    if (scene.type === "title") continue;
    const fact = byId.get(scene.props.factId);
    if (!fact) {
      throw new StoryboardError(`Scene "${scene.id}" references unknown fact "${scene.props.factId}"`);
    }
    if (scene.type === "big-number") assertNumberFact(scene, fact);
    else if (scene.type === "line-chart") assertLineChartFact(scene, fact);
    else assertBarRaceFact(scene, fact);
  }
}

export function assertDuration(totalMs: number): void {
  if (!Number.isFinite(totalMs) || totalMs < MIN_VIDEO_MS || totalMs > MAX_VIDEO_MS) {
    throw new StoryboardError(
      `Video length ${(totalMs / 1000).toFixed(1)}s is outside the required ${MIN_VIDEO_MS / 1000}-${MAX_VIDEO_MS / 1000}s`,
    );
  }
}

const MAX_CALLOUTS: Record<Scene["type"], number> = {
  title: 0,
  "big-number": 1,
  "line-chart": 3,
  "bar-race": 1,
};

function assertCueAnchor(scene: Scene, cue: Scene["cues"][number]): void {
  if (scene.type === "line-chart") {
    if (cue.x === undefined) {
      throw new StoryboardError(`Scene "${scene.id}" (line-chart) callout cues need an x anchor`);
    }
    const lo = scene.props.points[0].x;
    const hi = scene.props.points[scene.props.points.length - 1].x;
    if (cue.x < lo || cue.x > hi) {
      throw new StoryboardError(
        `Scene "${scene.id}" (line-chart) cue x ${cue.x} is outside the chart's x range ${lo}-${hi}`,
      );
    }
  } else if (cue.x !== undefined) {
    throw new StoryboardError(`Scene "${scene.id}" (${scene.type}) does not use cue x anchors`);
  }
}

/** Rejects cues the scene would silently ignore at render time. */
export function assertCuesSupported(sb: Storyboard): void {
  for (const scene of sb.scenes) {
    if (scene.type === "title" && scene.cues.length > 0) {
      throw new StoryboardError(`Scene "${scene.id}" (title) does not support cues`);
    }
    const emphasize = scene.cues.find((cue) => cue.do === "emphasize");
    if (emphasize) {
      throw new StoryboardError(`Scene "${scene.id}" (${scene.type}) cannot render "emphasize" cues`);
    }
    const callouts = scene.cues.filter((cue) => cue.do === "callout").length;
    if (callouts > MAX_CALLOUTS[scene.type]) {
      throw new StoryboardError(
        `Scene "${scene.id}" (${scene.type}) supports at most ${MAX_CALLOUTS[scene.type]} callout cue; got ${callouts}`,
      );
    }
    for (const cue of scene.cues) assertCueAnchor(scene, cue);
  }
}

export const TITLE_MAX_FONT_PX = 190;

export function assertHeadlinesFit(sb: Storyboard): void {
  for (const scene of sb.scenes) {
    if (scene.type !== "title") continue;
    try {
      fitTitleFontSize(scene.props.headline, TITLE_LANE.width, TITLE_LANE.height, TITLE_MAX_FONT_PX);
    } catch (error) {
      if (error instanceof RangeError) {
        throw new StoryboardError(`Scene "${scene.id}" headline does not fit: ${error.message}`);
      }
      throw error;
    }
  }
}
