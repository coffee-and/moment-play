export const MOSAIC_CELL_STATE = {
  UNKNOWN: 0,
  FILLED: 1,
  MARKED: 2,
};

export function getMosaicNeighbors(index, size) {
  const row = Math.floor(index / size);
  const col = index % size;
  const neighbors = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= 0 && nextRow < size && nextCol >= 0 && nextCol < size) {
        neighbors.push(nextRow * size + nextCol);
      }
    }
  }
  return neighbors;
}

export function createMosaicClues(solution, size) {
  return solution.map((_, index) => getMosaicNeighbors(index, size)
    .filter((neighbor) => solution[neighbor] === MOSAIC_CELL_STATE.FILLED).length);
}

export function getMosaicClueState(board, clues, index, size) {
  const neighbors = getMosaicNeighbors(index, size);
  const filled = neighbors.filter((neighbor) => board[neighbor] === MOSAIC_CELL_STATE.FILLED).length;
  const unknown = neighbors.filter((neighbor) => board[neighbor] === MOSAIC_CELL_STATE.UNKNOWN).length;
  if (filled > clues[index] || filled + unknown < clues[index]) return "conflict";
  if (filled === clues[index] && unknown === 0) return "satisfied";
  return "open";
}

export function isMosaicSolved(board, solution) {
  return solution.every((cell, index) => (
    cell === MOSAIC_CELL_STATE.FILLED
      ? board[index] === MOSAIC_CELL_STATE.FILLED
      : board[index] !== MOSAIC_CELL_STATE.FILLED
  ));
}

const HEART = [
  0, 1, 1, 0, 0, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  0, 1, 1, 1, 1, 1, 1, 0,
  0, 0, 1, 1, 1, 1, 0, 0,
  0, 0, 0, 1, 1, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const MOON = [
  0, 0, 1, 1, 1, 0, 0, 0,
  0, 1, 1, 1, 0, 0, 0, 0,
  1, 1, 1, 0, 0, 0, 0, 0,
  1, 1, 1, 0, 0, 0, 0, 0,
  1, 1, 1, 0, 0, 0, 0, 0,
  0, 1, 1, 1, 0, 0, 0, 0,
  0, 0, 1, 1, 1, 1, 0, 0,
  0, 0, 0, 1, 1, 1, 1, 0,
];

export const MOSAIC_PUZZLES = [HEART, MOON].map((solution) => ({
  size: 8,
  solution,
  clues: createMosaicClues(solution, 8),
}));
