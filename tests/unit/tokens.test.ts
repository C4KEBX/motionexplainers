import { describe, expect, it } from "vitest";
import { PALETTE, SAFE, VIDEO } from "../../src/design/tokens";

describe("tokens", () => {
  it("is 1080x1920 at 30fps", () => {
    expect(VIDEO).toEqual({ width: 1080, height: 1920, fps: 30 });
  });
  it("keeps the top 8% and bottom 20% safe", () => {
    expect(SAFE.top).toBe(Math.ceil(VIDEO.height * 0.08));
    expect(SAFE.bottom).toBe(Math.ceil(VIDEO.height * 0.2));
    expect(SAFE.side).toBe(60);
  });
  it("defines semantic palette colors as hex", () => {
    for (const color of Object.values(PALETTE)) expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(PALETTE.positive).not.toBe(PALETTE.negative);
  });
});
