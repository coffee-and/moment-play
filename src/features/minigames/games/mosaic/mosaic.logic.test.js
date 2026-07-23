import { describe, expect, it } from "vitest";
import {
  createMosaicClues,
  getMosaicClueState,
  isMosaicSolved,
  MOSAIC_CELL_STATE,
} from "./mosaic.logic.js";

describe("Mosaic rules", () => {
  it("counts filled cells in the clue cell and its surrounding neighbors", () => {
    const solution = [
      1, 0, 1,
      0, 1, 0,
      1, 0, 1,
    ];
    const clues = createMosaicClues(solution, 3);
    expect(clues[4]).toBe(5);
    expect(clues[0]).toBe(2);
  });

  it("reports impossible clue states", () => {
    const board = Array(9).fill(MOSAIC_CELL_STATE.UNKNOWN);
    board[0] = MOSAIC_CELL_STATE.FILLED;
    const clues = Array(9).fill(0);
    expect(getMosaicClueState(board, clues, 0, 3)).toBe("conflict");
  });

  it("accepts marked or unknown cells as empty when the picture is correct", () => {
    const solution = [1, 0, 1, 0];
    expect(isMosaicSolved([1, 2, 1, 0], solution)).toBe(true);
    expect(isMosaicSolved([1, 1, 1, 0], solution)).toBe(false);
  });
});
