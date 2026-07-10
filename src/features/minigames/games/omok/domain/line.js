import { OMOK_MODE, STONE } from "../omok.constants.js";
import { placeStone } from "./board.js";

export const OMOK_DIRECTIONS = Object.freeze([
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]);

function collectDirection(board, position, stone, [rowStep, colStep], multiplier) {
  const positions = [];
  let row = position.row + rowStep * multiplier;
  let col = position.col + colStep * multiplier;

  while (board[row]?.[col] === stone) {
    positions.push({ row, col });
    row += rowStep * multiplier;
    col += colStep * multiplier;
  }

  return positions;
}

export function getContiguousLine(board, position, stone, direction) {
  if (board[position.row]?.[position.col] !== stone) return [];

  const before = collectDirection(board, position, stone, direction, -1).reverse();
  const after = collectDirection(board, position, stone, direction, 1);
  return [...before, position, ...after];
}

export function getLongestLine(board, position, stone) {
  return OMOK_DIRECTIONS.reduce((longest, direction) => {
    const line = getContiguousLine(board, position, stone, direction);
    return line.length > longest.length ? line : longest;
  }, []);
}

export function hasOverline(board, position, stone = STONE.BLACK) {
  return OMOK_DIRECTIONS.some((direction) => getContiguousLine(board, position, stone, direction).length >= 6);
}

export function getWinningLine(board, position, stone, gameMode = OMOK_MODE.FREE) {
  for (const direction of OMOK_DIRECTIONS) {
    const line = getContiguousLine(board, position, stone, direction);
    const isStandardBlack = gameMode === OMOK_MODE.STANDARD && stone === STONE.BLACK;
    const isWinningLength = isStandardBlack ? line.length === 5 : line.length >= 5;

    if (isWinningLength) return line;
  }

  return [];
}

function getLinePositions(board, anchor, [rowStep, colStep]) {
  const positions = [];

  for (let offset = -14; offset <= 14; offset += 1) {
    const row = anchor.row + rowStep * offset;
    const col = anchor.col + colStep * offset;
    if (board[row]?.[col] !== undefined) positions.push({ row, col });
  }

  return positions;
}

export function getExactFiveWinningPoints(board, anchor, direction, stone = STONE.BLACK) {
  const winningPoints = [];

  for (const candidate of getLinePositions(board, anchor, direction)) {
    if (board[candidate.row][candidate.col] !== null) continue;

    const nextBoard = placeStone(board, candidate, stone);
    const line = getContiguousLine(nextBoard, anchor, stone, direction);
    const containsCandidate = line.some((item) => item.row === candidate.row && item.col === candidate.col);

    if (containsCandidate && line.length === 5) winningPoints.push(candidate);
  }

  return winningPoints;
}
