import { describe, expect, it } from "vitest";
import {
  createHiddenBoard,
  getNeighborIndexes,
  isMinesweeperWon,
  MINE_CELL_STATE,
  plantMines,
  revealMineCell,
  toggleMineFlag,
} from "./minesweeper.logic.js";

describe("Minesweeper rules", () => {
  it("keeps the first selected cell and its neighbors safe", () => {
    const board = plantMines(5, 4, 12, () => 0);
    const safeArea = [12, ...getNeighborIndexes(12, 5)];
    expect(board.filter((cell) => cell.isMine)).toHaveLength(4);
    expect(safeArea.every((index) => !board[index].isMine)).toBe(true);
  });

  it("reveals connected empty cells and preserves flags", () => {
    const hidden = createHiddenBoard(5);
    const flagged = toggleMineFlag(hidden, 0);
    expect(flagged[0].state).toBe(MINE_CELL_STATE.FLAGGED);
    expect(toggleMineFlag(flagged, 0)[0].state).toBe(MINE_CELL_STATE.HIDDEN);

    const board = plantMines(5, 1, 12, () => 0);
    const result = revealMineCell(board, 12, 5);
    expect(result.hitMine).toBe(false);
    expect(result.board.filter((cell) => cell.state === MINE_CELL_STATE.REVEALED).length).toBeGreaterThan(1);
  });

  it("detects both a mine hit and a cleared board", () => {
    const board = plantMines(4, 1, 0, () => 0);
    const mineIndex = board.findIndex((cell) => cell.isMine);
    expect(revealMineCell(board, mineIndex, 4).hitMine).toBe(true);
    expect(isMinesweeperWon(board.map((cell) => (
      cell.isMine ? cell : { ...cell, state: MINE_CELL_STATE.REVEALED }
    )))).toBe(true);
  });
});
