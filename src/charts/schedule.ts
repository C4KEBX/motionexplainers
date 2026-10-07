export type Knot = { frame: number; progress: number };

/**
 * Per-knot slope (progress per frame). Interior knots use the harmonic mean of the neighbouring
 * secants (0 where the direction changes or a segment is flat), the start launches at twice its
 * secant and the end settles at 0. Every segment stays inside the monotone region, so the cursor
 * never overshoots or backtracks while its speed stays continuous through callouts.
 */
function slopes(knots: readonly Knot[]): number[] {
  const secants = knots.slice(1).map((k, i) => (k.progress - knots[i].progress) / (k.frame - knots[i].frame));
  return knots.map((_, i) => {
    if (i === 0) return 2 * secants[0];
    if (i === knots.length - 1) return 0;
    const [a, b] = [secants[i - 1], secants[i]];
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  });
}

function assertKnots(knots: readonly Knot[]): void {
  if (knots.length < 2) throw new RangeError("a schedule needs at least two knots");
  knots.forEach((k, i) => {
    if (i === 0) return;
    if (k.frame <= knots[i - 1].frame) throw new RangeError("knot frames must strictly increase");
    if (k.progress < knots[i - 1].progress) throw new RangeError("knot progress must not decrease");
  });
}

/** Draw progress at `frame`: a monotone cubic Hermite curve through the knots. */
export function scheduleProgress(frame: number, knots: readonly Knot[]): number {
  assertKnots(knots);
  const first = knots[0];
  const last = knots[knots.length - 1];
  if (frame <= first.frame) return first.progress;
  if (frame >= last.frame) return last.progress;
  const i = knots.findIndex((_, idx) => idx < knots.length - 1 && frame < knots[idx + 1].frame);
  const [a, b] = [knots[i], knots[i + 1]];
  const m = slopes(knots);
  const h = b.frame - a.frame;
  const t = (frame - a.frame) / h;
  const value =
    (2 * t ** 3 - 3 * t ** 2 + 1) * a.progress +
    (t ** 3 - 2 * t ** 2 + t) * h * m[i] +
    (-2 * t ** 3 + 3 * t ** 2) * b.progress +
    (t ** 3 - t ** 2) * h * m[i + 1];
  return Math.min(last.progress, Math.max(first.progress, value));
}
