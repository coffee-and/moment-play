import { SUDOKU_BOARD_SIZE, SUDOKU_BOX_SIZE, SUDOKU_CELL_COUNT } from "./sudoku.constants.js";

export function getRowIndex(cellIndex) {
  return Math.floor(cellIndex / SUDOKU_BOARD_SIZE);
}

export function getColumnIndex(cellIndex) {
  return cellIndex % SUDOKU_BOARD_SIZE;
}

export function getBoxIndex(cellIndex) {
  const row = getRowIndex(cellIndex);
  const column = getColumnIndex(cellIndex);
  return Math.floor(row / SUDOKU_BOX_SIZE) * SUDOKU_BOX_SIZE + Math.floor(column / SUDOKU_BOX_SIZE);
}

export function getRowIndexes(cellIndex) {
  const row = getRowIndex(cellIndex);
  const startIndex = row * SUDOKU_BOARD_SIZE;
  return Array.from({ length: SUDOKU_BOARD_SIZE }, (_, offset) => startIndex + offset);
}

export function getColumnIndexes(cellIndex) {
  const column = getColumnIndex(cellIndex);
  return Array.from({ length: SUDOKU_BOARD_SIZE }, (_, row) => row * SUDOKU_BOARD_SIZE + column);
}

export function getBoxIndexes(cellIndex) {
  const row = getRowIndex(cellIndex);
  const column = getColumnIndex(cellIndex);
  const boxStartRow = Math.floor(row / SUDOKU_BOX_SIZE) * SUDOKU_BOX_SIZE;
  const boxStartColumn = Math.floor(column / SUDOKU_BOX_SIZE) * SUDOKU_BOX_SIZE;
  const indexes = [];
  for (let rowOffset = 0; rowOffset < SUDOKU_BOX_SIZE; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < SUDOKU_BOX_SIZE; columnOffset += 1) {
      indexes.push((boxStartRow + rowOffset) * SUDOKU_BOARD_SIZE + boxStartColumn + columnOffset);
    }
  }
  return indexes;
}

export function isGivenCell(puzzle, index) {
  return Number(puzzle[index]) > 0;
}

export function getCellValue(puzzle, userValues, index) {
  return isGivenCell(puzzle, index) ? puzzle[index] : userValues[index] || 0;
}

export function hasConflict(board, index, value) {
  if (!value) return false;
  const relatedIndexes = [...getRowIndexes(index), ...getColumnIndexes(index), ...getBoxIndexes(index)];
  return relatedIndexes.some((relatedIndex) => relatedIndex !== index && board[relatedIndex] === value);
}

export function getConflictIndexes(board) {
  return board.reduce((indexes, value, index) => {
    if (hasConflict(board, index, value)) indexes.push(index);
    return indexes;
  }, []);
}

export function isBoardComplete(board, solution) {
  return board.length === SUDOKU_CELL_COUNT && solution.length === SUDOKU_CELL_COUNT && board.every((value, index) => value !== 0 && value === solution[index]);
}
