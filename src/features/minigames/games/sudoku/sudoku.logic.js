import { SUDOKU_BOARD_SIZE, SUDOKU_BOX_SIZE, SUDOKU_CELL_COUNT } from "./sudoku.constants.js";

export function getRowIndex(cellIndex) {
  return Math.floor(cellIndex / SUDOKU_BOARD_SIZE);
}

export function getColumnIndex(cellIndex) {
  return cellIndex % SUDOKU_BOARD_SIZE;
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

function getCandidateNumbers(board, index) {
  return Array.from({ length: SUDOKU_BOARD_SIZE }, (_, offset) => offset + 1)
    .filter((value) => !hasConflict(board, index, value));
}

export function solveSudoku(puzzle) {
  if (!Array.isArray(puzzle) || puzzle.length !== SUDOKU_CELL_COUNT) return null;
  const board = puzzle.map(Number);
  if (board.some((value) => !Number.isInteger(value) || value < 0 || value > SUDOKU_BOARD_SIZE)) return null;
  if (getConflictIndexes(board).length > 0) return null;

  function solveNextCell() {
    let targetIndex = -1;
    let targetCandidates = null;

    for (let index = 0; index < board.length; index += 1) {
      if (board[index] !== 0) continue;
      const candidates = getCandidateNumbers(board, index);
      if (!candidates.length) return false;
      if (targetCandidates === null || candidates.length < targetCandidates.length) {
        targetIndex = index;
        targetCandidates = candidates;
      }
    }

    if (targetIndex < 0) return true;
    for (const candidate of targetCandidates) {
      board[targetIndex] = candidate;
      if (solveNextCell()) return true;
    }
    board[targetIndex] = 0;
    return false;
  }

  return solveNextCell() ? board : null;
}

export function isBoardComplete(board) {
  return Array.isArray(board)
    && board.length === SUDOKU_CELL_COUNT
    && board.every((value) => Number.isInteger(value) && value >= 1 && value <= SUDOKU_BOARD_SIZE)
    && getConflictIndexes(board).length === 0;
}
