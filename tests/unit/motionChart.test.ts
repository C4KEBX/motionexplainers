import { describe, expect, it } from "vitest";
import { dataFrameAt, dataProgress, easeInOutCubic } from "../../src/design/motion";

describe("easeInOutCubic", () => {
  it("is 0 at 0, 0.5 at 0.5, 1 at 1 and clamps outside", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(-3)).toBe(0);
    expect(easeInOutCubic(4)).toBe(1);
  });
  it("is monotonic and never overshoots", () => {
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.01) {
      const v = easeInOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeLessThanOrEqual(1);
      prev = v;
    }
  });
});

describe("dataFrameAt (inverse of dataProgress)", () => {
  it("hits the start and the end", () => {
    expect(dataFrameAt(0, 10, 60)).toBe(10);
    expect(dataFrameAt(1, 10, 60)).toBe(70);
  });
  it("round-trips through dataProgress", () => {
    for (const p of [0, 0.1, 0.25, 0.5, 0.9, 1]) {
      expect(dataProgress(dataFrameAt(p, 10, 60), 10, 60)).toBeCloseTo(p, 8);
    }
  });
  it("clamps out-of-range targets and rejects a bad duration", () => {
    expect(dataFrameAt(-1, 10, 60)).toBe(10);
    expect(dataFrameAt(9, 10, 60)).toBe(70);
    expect(() => dataFrameAt(0.5, 0, 0)).toThrow(RangeError);
  });
});
