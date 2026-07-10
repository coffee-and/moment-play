import { OMOK_BOARD_SIZE, PLAYER_STONE_CHOICE, STONE } from "./omok.constants.js";

export { OMOK_BOARD_SIZE } from "./omok.constants.js";
export { createEmptyBoard as createInitialBoard, isSamePosition, positionKey } from "./domain/index.js";

export function pointToPercent(point, boardSize = OMOK_BOARD_SIZE) {
  return `${6.5 + (point / (boardSize - 1)) * 87}%`;
}

export function resolvePlayerStone(choice, random = Math.random) {
  if (choice !== PLAYER_STONE_CHOICE.RANDOM) return choice;
  return random() < 0.5 ? STONE.BLACK : STONE.WHITE;
}
