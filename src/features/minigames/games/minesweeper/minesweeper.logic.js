export const MINE_CELL_STATE = {
  HIDDEN: "hidden",
  REVEALED: "revealed",
  FLAGGED: "flagged",
};

export function getNeighborIndexes(index, size) {
  const row = Math.floor(index / size);
  const col = index % size;
  const neighbors = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= 0 && nextRow < size && nextCol >= 0 && nextCol < size) {
        neighbors.push(nextRow * size + nextCol);
      }
    }
  }
  return neighbors;
}

export function createHiddenBoard(size) {
  return Array.from({ length: size * size }, () => ({
    adjacent: 0,
    isMine: false,
    state: MINE_CELL_STATE.HIDDEN,
  }));
}

export function plantMines(size, mineCount, safeIndex, randomFn = Math.random, previousBoard = null) {
  const excluded = new Set([safeIndex, ...getNeighborIndexes(safeIndex, size)]);
  const candidates = Array.from({ length: size * size }, (_, index) => index)
    .filter((index) => !excluded.has(index));
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomFn() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }
  const mines = new Set(candidates.slice(0, mineCount));
  return Array.from({ length: size * size }, (_, index) => ({
    adjacent: getNeighborIndexes(index, size).filter((neighbor) => mines.has(neighbor)).length,
    isMine: mines.has(index),
    state: previousBoard?.[index]?.state === MINE_CELL_STATE.FLAGGED
      ? MINE_CELL_STATE.FLAGGED
      : MINE_CELL_STATE.HIDDEN,
  }));
}

export function revealMineCell(board, index, size) {
  const selected = board[index];
  if (!selected || selected.state !== MINE_CELL_STATE.HIDDEN) {
    return { board, hitMine: false, changed: false };
  }
  if (selected.isMine) {
    return {
      board: board.map((cell) => cell.isMine ? { ...cell, state: MINE_CELL_STATE.REVEALED } : cell),
      hitMine: true,
      changed: true,
    };
  }

  const nextBoard = board.map((cell) => ({ ...cell }));
  const queue = [index];
  const visited = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const cell = nextBoard[current];
    if (cell.isMine || cell.state === MINE_CELL_STATE.FLAGGED) continue;
    cell.state = MINE_CELL_STATE.REVEALED;
    if (cell.adjacent === 0) {
      getNeighborIndexes(current, size).forEach((neighbor) => {
        if (!visited.has(neighbor)) queue.push(neighbor);
      });
    }
  }
  return { board: nextBoard, hitMine: false, changed: true };
}

export function toggleMineFlag(board, index) {
  const cell = board[index];
  if (!cell || cell.state === MINE_CELL_STATE.REVEALED) return board;
  return board.map((item, itemIndex) => itemIndex === index
    ? { ...item, state: item.state === MINE_CELL_STATE.FLAGGED ? MINE_CELL_STATE.HIDDEN : MINE_CELL_STATE.FLAGGED }
    : item);
}

export function isMinesweeperWon(board) {
  return board.every((cell) => cell.isMine || cell.state === MINE_CELL_STATE.REVEALED);
}
