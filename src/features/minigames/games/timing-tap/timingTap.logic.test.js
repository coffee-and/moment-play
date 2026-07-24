import { describe, expect, it } from "vitest";
import {
  getNeedlePosition,
  getTimingRoundConfig,
  judgeTiming,
  scoreTimingResult,
} from "./timingTap.logic.js";

describe("timing tap logic", () => {
  it("moves the needle from left to right and back", () => {
    expect(getNeedlePosition(0, 1000)).toBe(0);
    expect(getNeedlePosition(500, 1000)).toBe(100);
    expect(getNeedlePosition(750, 1000)).toBe(50);
  });

  it("scores the center as perfect and distant taps as misses", () => {
    expect(judgeTiming(50, 50, 20)).toEqual({ grade: "PERFECT", score: 1000 });
    expect(judgeTiming(58, 50, 20).grade).toBe("GOOD");
    expect(judgeTiming(95, 50, 20)).toEqual({ grade: "MISS", score: 0 });
  });

  it("keeps the first five rounds approachable before increasing difficulty", () => {
    const first = getTimingRoundConfig(1, () => 0.5);
    const fifth = getTimingRoundConfig(5, () => 0.5);
    const tenth = getTimingRoundConfig(10, () => 0.5);
    expect(fifth.durationMs).toBeLessThan(first.durationMs);
    expect(fifth.targetWidth).toBeLessThan(first.targetWidth);
    expect(first.durationMs).toBeGreaterThan(1500);
    expect(fifth.durationMs).toBeGreaterThan(1100);
    expect(tenth.durationMs).toBeLessThan(fifth.durationMs);
    expect(tenth.targetWidth).toBeLessThan(fifth.targetWidth);
  });

  it("temporarily widens a target when focus assist is active", () => {
    const normal = getTimingRoundConfig(6, () => 0.5);
    const assisted = getTimingRoundConfig(6, () => 0.5, 4);
    expect(assisted.targetWidth).toBe(normal.targetWidth + 4);
    expect(assisted.focusAssisted).toBe(true);
  });

  it("raises only consecutive PERFECT scores and resets the combo otherwise", () => {
    const perfect = judgeTiming(50, 50, 20);
    expect(scoreTimingResult(perfect, 0)).toMatchObject({ points: 1000, combo: 1, multiplier: 1 });
    expect(scoreTimingResult(perfect, 1)).toMatchObject({ points: 1500, combo: 2, multiplier: 1.5 });
    expect(scoreTimingResult({ grade: "GOOD", score: 800 }, 3)).toMatchObject({ points: 800, combo: 0, multiplier: 1 });
  });
});
