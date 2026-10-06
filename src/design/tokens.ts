export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

/** Pixels kept clear of platform UI: top 8%, bottom 20% of the height; fixed side padding. */
export const SAFE = {
  top: Math.ceil(VIDEO.height * 0.08),
  bottom: Math.ceil(VIDEO.height * 0.2),
  side: 60,
} as const;

/** Bold flat palette. Semantic roles are fixed: gains/losses are never decorative. */
export const PALETTE = {
  ground: "#15133b",
  ink: "#fff7e8",
  positive: "#2ee59d",
  negative: "#ff5d5d",
  neutral: "#7c8cff",
  highlight: "#ffd23f",
} as const;

/** Space for headline text: between the safe zones, minus room for the kicker line. */
export const TITLE_LANE = {
  width: VIDEO.width - 2 * SAFE.side,
  height: VIDEO.height - SAFE.top - SAFE.bottom - 140,
} as const;
