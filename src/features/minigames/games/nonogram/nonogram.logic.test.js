import { describe, expect, it } from "vitest";
import { createNonogramPuzzle, getNonogramLineClue, isNonogramSolved } from "./nonogram.logic.js";

describe("nonogram logic", () => {
  it("builds clues from contiguous filled cells", () => {
    expect(getNonogramLineClue([true, true, false, true, false])).toEqual([2, 1]);
    expect(getNonogramLineClue([false, false])).toEqual([0]);
  });

  it("uses mobile-first board sizes for each difficulty", () => {
    expect(createNonogramPuzzle("easy", 1).size).toBe(5);
    expect(createNonogramPuzzle("normal", 1).size).toBe(8);
    expect(createNonogramPuzzle("hard", 1).size).toBe(10);
  });

  it("accepts any filled pattern that satisfies all clues", () => {
    const puzzle = createNonogramPuzzle("easy", 2);
    const states = puzzle.cells.map((filled) => filled ? 1 : 2);
    expect(isNonogramSolved(states, puzzle.clues, puzzle.size)).toBe(true);
    states[0] = states[0] === 1 ? 0 : 1;
    expect(isNonogramSolved(states, puzzle.clues, puzzle.size)).toBe(false);
  });
});
