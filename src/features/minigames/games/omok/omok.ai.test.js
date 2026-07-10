import { describe, expect, it } from "vitest";
import { COMPUTER_DIFFICULTY, OMOK_BOARD_SIZE, OMOK_MODE, STONE } from "./omok.constants.js";
import { chooseComputerMove } from "./ai/index.js";
import { createEmptyBoard, placeStone, validateMove } from "./domain/index.js";

function placeMany(board, stone, positions) {
  return positions.reduce((next, position) => placeStone(next, position, stone), board);
}

describe("chooseComputerMove", () => {
  it("returns a valid empty intersection", () => {
    const board = placeStone(createEmptyBoard(), { row: 7, col: 7 }, STONE.BLACK);
    const move = chooseComputerMove(board, STONE.WHITE, OMOK_MODE.STANDARD, COMPUTER_DIFFICULTY.EASY, {
      random: () => 0.4,
    });

    expect(move).not.toBeNull();
    expect(validateMove(board, move, STONE.WHITE, OMOK_MODE.STANDARD)).toEqual({ valid: true });
  });

  it("selects the center opening on an empty board", () => {
    const move = chooseComputerMove(createEmptyBoard(), STONE.BLACK, OMOK_MODE.STANDARD, COMPUTER_DIFFICULTY.NORMAL);
    expect(move).toEqual({ row: 7, col: 7 });
  });

  it("selects an immediate winning move", () => {
    const board = placeMany(createEmptyBoard(), STONE.WHITE, [
      { row: 7, col: 3 },
      { row: 7, col: 4 },
      { row: 7, col: 5 },
      { row: 7, col: 6 },
    ]);

    const move = chooseComputerMove(board, STONE.WHITE, OMOK_MODE.STANDARD, COMPUTER_DIFFICULTY.EASY);
    expect(move).toEqual({ row: 7, col: 7 });
  });

  it("blocks an opponent immediate winning move", () => {
    const board = placeMany(createEmptyBoard(), STONE.BLACK, [
      { row: 5, col: 4 },
      { row: 5, col: 5 },
      { row: 5, col: 6 },
      { row: 5, col: 7 },
    ]);

    const move = chooseComputerMove(board, STONE.WHITE, OMOK_MODE.STANDARD, COMPUTER_DIFFICULTY.EASY, {
      random: () => 0.99,
    });

    expect(move).toEqual({ row: 5, col: 8 });
  });

  it("returns valid moves for every difficulty", () => {
    const board = placeMany(createEmptyBoard(), STONE.BLACK, [
      { row: 7, col: 7 },
      { row: 8, col: 7 },
    ]);

    for (const difficulty of Object.values(COMPUTER_DIFFICULTY)) {
      const move = chooseComputerMove(board, STONE.WHITE, OMOK_MODE.STANDARD, difficulty, {
        random: () => 0.2,
      });
      expect(move).not.toBeNull();
      expect(validateMove(board, move, STONE.WHITE, OMOK_MODE.STANDARD)).toEqual({ valid: true });
    }
  });

  it("returns null when no valid move exists", () => {
    const board = Array.from({ length: OMOK_BOARD_SIZE }, () => Array.from({ length: OMOK_BOARD_SIZE }, () => STONE.BLACK));
    expect(chooseComputerMove(board, STONE.WHITE, OMOK_MODE.FREE, COMPUTER_DIFFICULTY.HARD)).toBeNull();
  });
});
