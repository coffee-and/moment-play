import {
  BOARD_CELLS,
  BOARD_SIZE,
  GAME_2048_DIRECTION,
} from "./game2048.constants.js";

export function createEmptyBoard() {
  return Array.from({ length: BOARD_CELLS }, () => 0);
}

export function boardsEqual(boardA, boardB) {
  return boardA.length === boardB.length && boardA.every((value, index) => value === boardB[index]);
}

export function getEmptyCellIndexes(board) {
  return board.reduce((indexes, value, index) => {
    if (value === 0) indexes.push(index);
    return indexes;
  }, []);
}

export function getEmptyCellCount(board) {
  return getEmptyCellIndexes(board).length;
}

export function addRandomTile(board, randomFn = Math.random) {
  const emptyIndexes = getEmptyCellIndexes(board);
  if (emptyIndexes.length === 0) return [...board];

  const next = [...board];
  const index = emptyIndexes[Math.floor(randomFn() * emptyIndexes.length)];
  next[index] = randomFn() < 0.9 ? 2 : 4;
  return next;
}

export function createInitialBoard(randomFn = Math.random) {
  return addRandomTile(addRandomTile(createEmptyBoard(), randomFn), randomFn);
}

export function mergeLine(line) {
  const values = line.filter((value) => value !== 0);
  const merged = [];
  let scoreDelta = 0;

  for (let index = 0; index < values.length; index += 1) {
    const current = values[index];
    const next = values[index + 1];

    if (current === next) {
      const mergedValue = current * 2;
      merged.push(mergedValue);
      scoreDelta += mergedValue;
      index += 1;
    } else {
      merged.push(current);
    }
  }

  while (merged.length < BOARD_SIZE) {
    merged.push(0);
  }

  return { line: merged, scoreDelta };
}

function readLine(board, direction, lineIndex) {
  const line = [];

  for (let offset = 0; offset < BOARD_SIZE; offset += 1) {
    if (direction === GAME_2048_DIRECTION.LEFT || direction === GAME_2048_DIRECTION.RIGHT) {
      const column = direction === GAME_2048_DIRECTION.LEFT ? offset : BOARD_SIZE - 1 - offset;
      line.push(board[lineIndex * BOARD_SIZE + column]);
    } else {
      const row = direction === GAME_2048_DIRECTION.UP ? offset : BOARD_SIZE - 1 - offset;
      line.push(board[row * BOARD_SIZE + lineIndex]);
    }
  }

  return line;
}

function writeLine(board, direction, lineIndex, line) {
  for (let offset = 0; offset < BOARD_SIZE; offset += 1) {
    if (direction === GAME_2048_DIRECTION.LEFT || direction === GAME_2048_DIRECTION.RIGHT) {
      const column = direction === GAME_2048_DIRECTION.LEFT ? offset : BOARD_SIZE - 1 - offset;
      board[lineIndex * BOARD_SIZE + column] = line[offset];
    } else {
      const row = direction === GAME_2048_DIRECTION.UP ? offset : BOARD_SIZE - 1 - offset;
      board[row * BOARD_SIZE + lineIndex] = line[offset];
    }
  }
}

export function moveBoard(board, direction) {
  const nextBoard = createEmptyBoard();
  let scoreDelta = 0;

  for (let lineIndex = 0; lineIndex < BOARD_SIZE; lineIndex += 1) {
    const result = mergeLine(readLine(board, direction, lineIndex));
    writeLine(nextBoard, direction, lineIndex, result.line);
    scoreDelta += result.scoreDelta;
  }

  return {
    board: nextBoard,
    changed: !boardsEqual(board, nextBoard),
    scoreDelta,
  };
}

export function getMaxTile(board) {
  return board.reduce((max, value) => Math.max(max, value), 0);
}

export function hasReachedTarget(board, target) {
  return getMaxTile(board) >= target;
}

export function hasAvailableMove(board) {
  if (getEmptyCellCount(board) > 0) return true;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const value = board[row * BOARD_SIZE + column];
      const right = column < BOARD_SIZE - 1 ? board[row * BOARD_SIZE + column + 1] : null;
      const down = row < BOARD_SIZE - 1 ? board[(row + 1) * BOARD_SIZE + column] : null;

      if (value === right || value === down) return true;
    }
  }

  return false;
}
