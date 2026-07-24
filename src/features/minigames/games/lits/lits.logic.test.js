import { describe, expect, it } from "vitest";
import { getLitsShapeType, LITS_PUZZLES, LITS_SOLUTION, validateLits } from "./lits.logic.js";

describe("LITS rules", () => {
  it("keeps the published answer valid", () => {
    expect(validateLits(LITS_SOLUTION).valid).toBe(true);
  });

  it("ships at least four structurally valid, distinct puzzles", () => {
    expect(LITS_PUZZLES.length).toBeGreaterThanOrEqual(4);
    expect(new Set(LITS_PUZZLES.map((puzzle) => puzzle.regionMap.join(","))).size).toBe(LITS_PUZZLES.length);

    LITS_PUZZLES.forEach((puzzle) => {
      expect(puzzle.regionMap).toHaveLength(puzzle.size ** 2);
      expect(puzzle.solution.every((index) => Number.isInteger(index) && index >= 0 && index < puzzle.size ** 2)).toBe(true);

      const regionIds = [...new Set(puzzle.regionMap)];
      regionIds.forEach((regionId) => {
        expect(puzzle.solution.filter((index) => puzzle.regionMap[index] === regionId)).toHaveLength(4);
      });
      expect(validateLits(puzzle.solution, puzzle.regionMap, puzzle.size).valid).toBe(true);
    });
  });

  it("recognizes rotations of the four allowed tetromino types", () => {
    expect(getLitsShapeType([0, 1, 2, 3])).toBe("I");
    expect(getLitsShapeType([0, 6, 12, 13])).toBe("L");
    expect(getLitsShapeType([0, 1, 2, 7])).toBe("T");
    expect(getLitsShapeType([1, 2, 6, 7])).toBe("S");
  });

  it("accepts a connected solution without 2x2 blocks or matching touching shapes", () => {
    const solution = [
      0, 1, 2, 6,
      3, 4, 5, 10,
      12, 13, 14, 19,
      15, 16, 17, 21,
      24, 25, 26, 30,
      27, 28, 29, 34,
    ];

    expect(validateLits(solution).valid).toBe(true);
  });

  it("rejects a region that does not contain exactly four shaded cells", () => {
    expect(validateLits([0, 1, 2])).toMatchObject({
      valid: false,
      reason: expect.stringContaining("네 칸"),
    });
  });
});
