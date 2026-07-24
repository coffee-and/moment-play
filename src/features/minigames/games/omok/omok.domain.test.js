import { describe, expect, it } from "vitest";
import { FORBIDDEN_REASON, MOVE_REJECTION_REASON, OMOK_BOARD_SIZE, OMOK_MODE, STONE } from "./omok.constants.js";
import {
  createEmptyBoard,
  getForbiddenReason,
  getWinningLine,
  placeStone,
  playMove,
  validateMove,
} from "./domain/index.js";

function placeMany(board, positions, stone) {
  return positions.reduce((next, position) => placeStone(next, position, stone), board);
}

function expectWinningMove({ positions, move, stone, mode, expectedLength = 5 }) {
  const board = placeMany(createEmptyBoard(), positions, stone);
  const result = playMove(board, move, stone, mode);

  expect(result.valid).toBe(true);
  expect(result.winner).toBe(stone);
  expect(result.winningLine).toHaveLength(expectedLength);
  expect(result.winningLine).toContainEqual(move);
}

describe("omok board", () => {
  it("creates a 15 by 15 empty board", () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(OMOK_BOARD_SIZE);
    expect(board.every((row) => row.length === OMOK_BOARD_SIZE)).toBe(true);
    expect(board.flat().every((cell) => cell === null)).toBe(true);
  });

  it("rejects placement on an occupied intersection", () => {
    const board = placeStone(createEmptyBoard(), { row: 1, col: 1 }, STONE.BLACK);
    expect(validateMove(board, { row: 1, col: 1 }, STONE.WHITE, OMOK_MODE.STANDARD)).toEqual({
      valid: false,
      reason: MOVE_REJECTION_REASON.OCCUPIED,
    });
  });
});

describe("omok winning rules", () => {
  it("detects a horizontal five-in-a-row win and returns the winning line", () => {
    expectWinningMove({
      positions: Array.from({ length: 4 }, (_, index) => ({ row: 7, col: 4 + index })),
      move: { row: 7, col: 8 },
      stone: STONE.BLACK,
      mode: OMOK_MODE.STANDARD,
    });
  });

  it("detects a vertical five-in-a-row win", () => {
    expectWinningMove({
      positions: Array.from({ length: 4 }, (_, index) => ({ row: 4 + index, col: 7 })),
      move: { row: 8, col: 7 },
      stone: STONE.BLACK,
      mode: OMOK_MODE.STANDARD,
    });
  });

  it("detects a diagonal five-in-a-row win", () => {
    expectWinningMove({
      positions: Array.from({ length: 4 }, (_, index) => ({ row: 4 + index, col: 4 + index })),
      move: { row: 8, col: 8 },
      stone: STONE.BLACK,
      mode: OMOK_MODE.STANDARD,
    });
  });

  it("detects a reverse-diagonal five-in-a-row win", () => {
    expectWinningMove({
      positions: Array.from({ length: 4 }, (_, index) => ({ row: 4 + index, col: 10 - index })),
      move: { row: 8, col: 6 },
      stone: STONE.BLACK,
      mode: OMOK_MODE.STANDARD,
    });
  });

  it("draws when the board becomes full without a winner", () => {
    const board = Array.from({ length: OMOK_BOARD_SIZE }, (_, row) =>
      Array.from({ length: OMOK_BOARD_SIZE }, (_, col) => ((row + 2 * col) % 5 === 0 ? STONE.BLACK : STONE.WHITE)),
    );
    board[14][14] = null;

    const result = playMove(board, { row: 14, col: 14 }, STONE.WHITE, OMOK_MODE.FREE);

    expect(result.valid).toBe(true);
    expect(result.winner).toBeNull();
    expect(result.draw).toBe(true);
  });
});

describe("standard omok forbidden moves", () => {
  it("rejects black double-three", () => {
    const board = placeMany(
      createEmptyBoard(),
      [
        { row: 7, col: 6 },
        { row: 7, col: 8 },
        { row: 6, col: 7 },
        { row: 8, col: 7 },
      ],
      STONE.BLACK,
    );

    expect(getForbiddenReason(board, { row: 7, col: 7 })).toBe(FORBIDDEN_REASON.DOUBLE_THREE);
    expect(validateMove(board, { row: 7, col: 7 }, STONE.BLACK, OMOK_MODE.STANDARD)).toEqual({
      valid: false,
      reason: MOVE_REJECTION_REASON.DOUBLE_THREE,
    });
  });

  it("rejects black double-four", () => {
    const board = placeMany(
      createEmptyBoard(),
      [
        { row: 7, col: 5 },
        { row: 7, col: 6 },
        { row: 7, col: 8 },
        { row: 5, col: 7 },
        { row: 6, col: 7 },
        { row: 8, col: 7 },
      ],
      STONE.BLACK,
    );

    expect(getForbiddenReason(board, { row: 7, col: 7 })).toBe(FORBIDDEN_REASON.DOUBLE_FOUR);
  });

  it("rejects black overline and only lets black win with exactly five", () => {
    const board = placeMany(
      createEmptyBoard(),
      Array.from({ length: 5 }, (_, index) => ({ row: 7, col: 3 + index })),
      STONE.BLACK,
    );

    expect(validateMove(board, { row: 7, col: 8 }, STONE.BLACK, OMOK_MODE.STANDARD)).toEqual({
      valid: false,
      reason: MOVE_REJECTION_REASON.OVERLINE,
    });
  });

  it("lets white win with five or more in standard mode", () => {
    expectWinningMove({
      positions: Array.from({ length: 5 }, (_, index) => ({ row: 7, col: 3 + index })),
      move: { row: 7, col: 8 },
      stone: STONE.WHITE,
      mode: OMOK_MODE.STANDARD,
      expectedLength: 6,
    });
  });
});

describe("free omok rules", () => {
  it("allows black overline", () => {
    const board = placeMany(
      createEmptyBoard(),
      Array.from({ length: 5 }, (_, index) => ({ row: 7, col: 3 + index })),
      STONE.BLACK,
    );
    const result = playMove(board, { row: 7, col: 8 }, STONE.BLACK, OMOK_MODE.FREE);

    expect(result.valid).toBe(true);
    expect(result.winner).toBe(STONE.BLACK);
    expect(getWinningLine(result.board, { row: 7, col: 8 }, STONE.BLACK, OMOK_MODE.FREE)).toHaveLength(6);
  });

  it("does not apply forbidden moves", () => {
    const board = placeMany(
      createEmptyBoard(),
      [
        { row: 7, col: 6 },
        { row: 7, col: 8 },
        { row: 6, col: 7 },
        { row: 8, col: 7 },
      ],
      STONE.BLACK,
    );

    expect(validateMove(board, { row: 7, col: 7 }, STONE.BLACK, OMOK_MODE.FREE)).toEqual({ valid: true });
  });
});
