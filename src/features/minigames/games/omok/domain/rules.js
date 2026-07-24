import { MOVE_REJECTION_REASON, OMOK_MODE, STONE } from "../omok.constants.js";
import { isBoardFull, isEmptyPosition, isInBounds, placeStone } from "./board.js";
import { getForbiddenReason } from "./forbidden.js";
import { getWinningLine } from "./line.js";

export function validateMove(board, position, stone, gameMode) {
  if (!isInBounds(position)) return { valid: false, reason: MOVE_REJECTION_REASON.OUT_OF_BOUNDS };
  if (!isEmptyPosition(board, position)) return { valid: false, reason: MOVE_REJECTION_REASON.OCCUPIED };

  if (gameMode === OMOK_MODE.STANDARD && stone === STONE.BLACK) {
    const reason = getForbiddenReason(board, position);
    if (reason) return { valid: false, reason };
  }

  return { valid: true };
}

export function playMove(board, position, stone, gameMode) {
  const validation = validateMove(board, position, stone, gameMode);

  if (!validation.valid) {
    return {
      valid: false,
      reason: validation.reason,
      board,
      winner: null,
      winningLine: [],
      draw: false,
    };
  }

  const nextBoard = placeStone(board, position, stone);
  const winningLine = getWinningLine(nextBoard, position, stone, gameMode);

  return {
    valid: true,
    board: nextBoard,
    winner: winningLine.length > 0 ? stone : null,
    winningLine,
    draw: winningLine.length === 0 && isBoardFull(nextBoard),
  };
}
