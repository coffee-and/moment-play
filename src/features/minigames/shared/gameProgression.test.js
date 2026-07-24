import { describe, expect, it } from "vitest";
import {
  canAdvanceEndlessDifficulty,
  formatEndlessMilestone,
  formatStarRating,
  getComboAward,
  getEndlessRoundProgress,
  getNextEndlessDifficulty,
  getStarRating,
} from "./gameProgression.js";

describe("shared game progression", () => {
  it("grows combo points up to the configured multiplier", () => {
    expect(getComboAward(10, 1)).toEqual({ points: 10, multiplier: 1 });
    expect(getComboAward(10, 2)).toEqual({ points: 20, multiplier: 2 });
    expect(getComboAward(10, 5)).toEqual({ points: 30, multiplier: 3 });
  });

  it("awards stars from progress while respecting mistakes", () => {
    expect(getStarRating(0.9, { mistakes: 0 })).toBe(3);
    expect(getStarRating(0.9, { mistakes: 1 })).toBe(2);
    expect(getStarRating(0.2)).toBe(1);
    expect(formatStarRating(2)).toBe("★★☆");
  });

  it("tracks repeating ten-round blocks without ending hard mode", () => {
    expect(getEndlessRoundProgress(10)).toEqual({ block: 1, blockRound: 10, isBlockEnd: true, round: 10 });
    expect(getEndlessRoundProgress(31)).toEqual({ block: 4, blockRound: 1, isBlockEnd: false, round: 31 });
    expect(getNextEndlessDifficulty("easy")).toBe("normal");
    expect(getNextEndlessDifficulty("hard")).toBe("hard");
    expect(canAdvanceEndlessDifficulty("normal")).toBe(true);
    expect(canAdvanceEndlessDifficulty("hard")).toBe(false);
    expect(formatEndlessMilestone("hard", 30)).toBe("HARD · 30 ROUND");
  });
});
