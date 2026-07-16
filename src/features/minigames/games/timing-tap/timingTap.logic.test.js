import { describe, expect, it } from "vitest";
import {
  getNeedlePosition,
  getTimingRoundConfig,
  judgeTiming,
} from "./timingTap.logic.js";

describe("timing tap logic", () => {
  it("moves the needle from left to right and back", () => {
    expect(getNeedlePosition(0, 1000)).toBe(0);
    expect(getNeedlePosition(500, 1000)).toBe(100);
    expect(getNeedlePosition(750, 1000)).toBe(50);
  });

  it("scores the center as perfect and distant taps as misses", () => {
    expect(judgeTiming(50, 50, 20)).toEqual({ grade: "PERFECT", score: 100 });
    expect(judgeTiming(58, 50, 20).grade).toBe("GOOD");
    expect(judgeTiming(95, 50, 20)).toEqual({ grade: "MISS", score: 0 });
  });

  it("makes later rounds faster with narrower targets", () => {
    const first = getTimingRoundConfig(1, () => 0.5);
    const fifth = getTimingRoundConfig(5, () => 0.5);
    expect(fifth.durationMs).toBeLessThan(first.durationMs);
    expect(fifth.targetWidth).toBeLessThan(first.targetWidth);
  });
});
