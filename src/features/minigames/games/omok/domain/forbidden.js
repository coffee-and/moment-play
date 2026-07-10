import { FORBIDDEN_REASON, OMOK_MODE, STONE } from "../omok.constants.js";
import { isEmptyPosition, placeStone } from "./board.js";
import { OMOK_DIRECTIONS, getExactFiveWinningPoints, getWinningLine, hasOverline } from "./line.js";

function hasFourInDirection(board, position, direction) {
  return getExactFiveWinningPoints(board, position, direction, STONE.BLACK).length >= 1;
}

function canCreateOpenFourInDirection(board, position, direction) {
  for (let offset = -4; offset <= 4; offset += 1) {
    if (offset === 0) continue;

    const candidate = {
      row: position.row + direction[0] * offset,
      col: position.col + direction[1] * offset,
    };

    if (!isEmptyPosition(board, candidate)) continue;

    const nextBoard = placeStone(board, candidate, STONE.BLACK);
    if (hasOverline(nextBoard, candidate, STONE.BLACK)) continue;

    const winningPoints = getExactFiveWinningPoints(nextBoard, position, direction, STONE.BLACK);
    if (winningPoints.length >= 2) return true;
  }

  return false;
}

export function countFourDirections(board, position) {
  return OMOK_DIRECTIONS.filter((direction) => hasFourInDirection(board, position, direction)).length;
}

export function countOpenThreeDirections(board, position) {
  return OMOK_DIRECTIONS.filter((direction) => canCreateOpenFourInDirection(board, position, direction)).length;
}

export function getForbiddenReason(board, position) {
  if (!isEmptyPosition(board, position)) return null;

  const nextBoard = placeStone(board, position, STONE.BLACK);

  if (hasOverline(nextBoard, position, STONE.BLACK)) return FORBIDDEN_REASON.OVERLINE;

  if (getWinningLine(nextBoard, position, STONE.BLACK, OMOK_MODE.STANDARD).length === 5) {
    return null;
  }

  if (countFourDirections(nextBoard, position) >= 2) return FORBIDDEN_REASON.DOUBLE_FOUR;
  if (countOpenThreeDirections(nextBoard, position) >= 2) return FORBIDDEN_REASON.DOUBLE_THREE;

  return null;
}

export function getForbiddenPositions(board) {
  const positions = [];

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const position = { row, col };
      if (getForbiddenReason(board, position)) positions.push(position);
    }
  }

  return positions;
}
