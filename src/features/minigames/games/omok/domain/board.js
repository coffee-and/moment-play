import { OMOK_BOARD_SIZE, STONE } from "../omok.constants.js";

export function createEmptyBoard(size = OMOK_BOARD_SIZE) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

export function isInBounds({ row, col }) {
  return row >= 0 && row < OMOK_BOARD_SIZE && col >= 0 && col < OMOK_BOARD_SIZE;
}

export function isEmptyPosition(board, position) {
  return isInBounds(position) && board[position.row][position.col] === null;
}

export function placeStone(board, position, stone) {
  if (!isEmptyPosition(board, position)) return board;

  const nextBoard = board.slice();
  nextBoard[position.row] = board[position.row].slice();
  nextBoard[position.row][position.col] = stone;
  return nextBoard;
}

export function getNextStone(stone) {
  return stone === STONE.BLACK ? STONE.WHITE : STONE.BLACK;
}

export function positionKey({ row, col }) {
  return `${row}:${col}`;
}

export function isSamePosition(a, b) {
  return Boolean(a && b && a.row === b.row && a.col === b.col);
}

export function isBoardFull(board) {
  return board.every((row) => row.every(Boolean));
}
