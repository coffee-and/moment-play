import { OMOK_BOARD_SIZE } from "../omok.constants.js";
import { isEmptyPosition, positionKey, validateMove } from "../domain/index.js";

const CENTER = Math.floor(OMOK_BOARD_SIZE / 2);

function distanceFromCenter({ row, col }) {
  return Math.abs(row - CENTER) + Math.abs(col - CENTER);
}

function comparePositions(a, b) {
  const centerDifference = distanceFromCenter(a) - distanceFromCenter(b);
  if (centerDifference !== 0) return centerDifference;
  if (a.row !== b.row) return a.row - b.row;
  return a.col - b.col;
}

export function getCandidateMoves(board, stone, gameMode, radius = 2) {
  const occupied = [];

  for (let row = 0; row < OMOK_BOARD_SIZE; row += 1) {
    for (let col = 0; col < OMOK_BOARD_SIZE; col += 1) {
      if (board[row][col]) occupied.push({ row, col });
    }
  }

  if (occupied.length === 0) {
    const center = { row: CENTER, col: CENTER };
    return validateMove(board, center, stone, gameMode).valid ? [center] : [];
  }

  const candidateMap = new Map();

  for (const anchor of occupied) {
    for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
      for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
        const position = {
          row: anchor.row + rowOffset,
          col: anchor.col + colOffset,
        };

        if (!isEmptyPosition(board, position)) continue;
        if (!validateMove(board, position, stone, gameMode).valid) continue;
        candidateMap.set(positionKey(position), position);
      }
    }
  }

  return [...candidateMap.values()].sort(comparePositions);
}
