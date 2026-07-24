import { describe, expect, it } from "vitest";
import {
  BLOCK_BLAST_SIZE,
  canPlaceBlockPiece,
  createBlockBoard,
  findBestBlockMove,
  getNextBlockBlastCombo,
  hasBlockMove,
  placeBlockPiece,
} from "./blockBlast.logic.js";

const horizontalThree = { color: 1, cells: [[0, 0], [0, 1], [0, 2]] };

describe("Block Blast rules", () => {
  it("rejects pieces outside the board or on occupied cells", () => {
    const board = createBlockBoard();
    board[0] = 1;
    expect(canPlaceBlockPiece(board, horizontalThree, 0, 0)).toBe(false);
    expect(canPlaceBlockPiece(board, horizontalThree, 0, BLOCK_BLAST_SIZE - 2)).toBe(false);
  });

  it("places a piece and clears a completed line", () => {
    const board = createBlockBoard();
    for (let col = 0; col < 5; col += 1) board[col] = 2;
    const result = placeBlockPiece(board, horizontalThree, 0, 5);
    expect(result.placed).toBe(true);
    expect(result.clearedLines).toBe(1);
    expect(result.board.slice(0, BLOCK_BLAST_SIZE).every((cell) => cell === 0)).toBe(true);
  });

  it("detects when none of the remaining pieces fit", () => {
    const board = Array(BLOCK_BLAST_SIZE * BLOCK_BLAST_SIZE).fill(1);
    expect(hasBlockMove(board, [horizontalThree])).toBe(false);
    board[0] = 0;
    expect(hasBlockMove(board, [{ color: 1, cells: [[0, 0]] }])).toBe(true);
  });

  it("recommends a placement that clears a line when one is available", () => {
    const board = createBlockBoard();
    for (let col = 0; col < 5; col += 1) board[col] = 2;
    const move = findBestBlockMove(board, [horizontalThree]);
    const result = placeBlockPiece(board, horizontalThree, move.row, move.col);

    expect(move).toMatchObject({ pieceIndex: 0, row: 0, col: 5 });
    expect(result.clearedLines).toBe(1);
  });

  it("resets a clear combo after a valid placement that removes no line", () => {
    expect(getNextBlockBlastCombo(3, 0)).toBe(0);
    expect(getNextBlockBlastCombo(0, 1)).toBe(1);
    expect(getNextBlockBlastCombo(2, 2)).toBe(3);
  });
});
