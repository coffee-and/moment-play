import { describe, expect, it } from "vitest";
import { formatStarRating, getComboAward, getStarRating } from "./gameProgression.js";

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
});
