import { describe, expect, it } from "vitest";
import {
  createRectangle,
  isShikakuComplete,
  SHIKAKU_PUZZLES,
  validateShikakuRectangle,
} from "./shikaku.logic.js";

describe("Shikaku rules", () => {
  it("accepts a rectangle with one clue whose value matches its area", () => {
    const puzzle = SHIKAKU_PUZZLES[0];
    const rectangle = createRectangle({ row: 0, col: 0 }, { row: 1, col: 1 });

    expect(validateShikakuRectangle(rectangle, puzzle.clues)).toMatchObject({
      valid: true,
      clue: { value: 4 },
    });
  });

  it("rejects overlap and mismatched areas", () => {
    const puzzle = SHIKAKU_PUZZLES[0];
    const claimed = createRectangle({ row: 0, col: 0 }, { row: 1, col: 1 });
    expect(validateShikakuRectangle(claimed, puzzle.clues, [claimed]).valid).toBe(false);
    expect(validateShikakuRectangle(
      createRectangle({ row: 0, col: 0 }, { row: 0, col: 0 }),
      puzzle.clues,
    ).valid).toBe(false);
  });

  it("finishes only when the rectangles cover the whole board", () => {
    const rectangles = [
      createRectangle({ row: 0, col: 0 }, { row: 1, col: 1 }),
      createRectangle({ row: 0, col: 2 }, { row: 1, col: 4 }),
      createRectangle({ row: 2, col: 0 }, { row: 4, col: 0 }),
      createRectangle({ row: 2, col: 1 }, { row: 3, col: 2 }),
      createRectangle({ row: 2, col: 3 }, { row: 4, col: 4 }),
      createRectangle({ row: 4, col: 1 }, { row: 4, col: 2 }),
    ];
    expect(isShikakuComplete(5, rectangles)).toBe(true);
    expect(isShikakuComplete(5, rectangles.slice(0, -1))).toBe(false);
  });
});
