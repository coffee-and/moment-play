import {
  COMPUTER_DIFFICULTY,
  MATCH_TYPE,
  OMOK_BOARD_SIZE,
  OMOK_MODE,
  PLAYER_STONE_CHOICE,
  STONE,
} from "./omok.constants.js";
import { getNextStone } from "./domain/index.js";

export { OMOK_BOARD_SIZE } from "./omok.constants.js";
export { createEmptyBoard as createInitialBoard, isSamePosition, positionKey } from "./domain/index.js";

export function pointToPercent(point, boardSize = OMOK_BOARD_SIZE) {
  return `${6.5 + (point / (boardSize - 1)) * 87}%`;
}

export function resolvePlayerStone(choice, random = Math.random) {
  if (choice !== PLAYER_STONE_CHOICE.RANDOM) return choice;
  return random() < 0.5 ? STONE.BLACK : STONE.WHITE;
}

export function createOmokMatchConfig(matchType, settings, random = Math.random) {
  const gameMode = settings.gameMode ?? OMOK_MODE.STANDARD;
  const isComputerMatch = matchType === MATCH_TYPE.COMPUTER;
  const playerStone = isComputerMatch
    ? resolvePlayerStone(settings.playerStoneChoice ?? PLAYER_STONE_CHOICE.RANDOM, random)
    : STONE.BLACK;

  return {
    computerDifficulty: settings.computerDifficulty ?? COMPUTER_DIFFICULTY.NORMAL,
    computerStone: isComputerMatch ? getNextStone(playerStone) : null,
    explainForbiddenReasons: gameMode === OMOK_MODE.STANDARD && Boolean(settings.explainForbiddenReasons),
    gameMode,
    matchType,
    playerStone,
    showForbiddenPositions: gameMode === OMOK_MODE.STANDARD && Boolean(settings.showForbiddenPositions),
  };
}
