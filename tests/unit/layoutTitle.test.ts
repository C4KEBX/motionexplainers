import { describe, expect, it } from "vitest";
import { fitTitleFontSize } from "../../src/design/layout";

const LANE_W = 960;
const LANE_H = 1240;

describe("fitTitleFontSize", () => {
  it("keeps the max size when the headline fits", () => {
    expect(fitTitleFontSize("The S&P 500 in 2008", LANE_W, LANE_H, 190)).toBe(190);
  });
  it("shrinks long headlines so the wrapped block fits the lane height", () => {
    const long = Array.from({ length: 20 }, () => "gold").join(" ");
    const size = fitTitleFontSize(long, LANE_W, LANE_H, 190);
    expect(size).toBeLessThan(190);
    expect(size).toBeGreaterThanOrEqual(64);
  });
  it("shrinks so the longest word fits the lane width", () => {
    const size = fitTitleFontSize("Bankruptcies", LANE_W, LANE_H, 190);
    expect("Bankruptcies".length * size * 0.75).toBeLessThanOrEqual(LANE_W);
  });
  it("throws when even the minimum size cannot fit", () => {
    expect(() => fitTitleFontSize("Pneumonoultramicroscopicsilicovolcanoconiosis", LANE_W, LANE_H, 190)).toThrow(RangeError);
  });
});
