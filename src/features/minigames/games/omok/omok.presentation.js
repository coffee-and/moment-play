import {
  COMPUTER_DIFFICULTY,
  MATCH_TYPE,
  OMOK_MODE,
  OMOK_MODE_LABEL,
  OMOK_RESULT_REASON,
  PLAYER_STONE_CHOICE,
  STONE,
} from "./omok.constants.js";

export const DEFAULT_OMOK_GAME_META = {
  eyebrow: "BOARD / 1 VS 1",
  title: "Omok",
  description: "온라인 대전과 컴퓨터 대전을 지원하는 15x15 보드 게임입니다.",
};

export const OMOK_SCREEN = Object.freeze({
  MENU: "menu",
  FRIEND_ROOM_CREATE: "friend-room-create",
  COMPUTER_SETUP: "computer-setup",
  GAME_START: "game-start",
  PLAYING: "playing",
});

export const OMOK_DIALOG = Object.freeze({
  NICKNAME: "nickname",
  SETTINGS: "settings",
  LEAVE_CONFIRM: "leave-confirm",
  RULES: "rules",
  START: "start",
});

export const DEFAULT_OMOK_SETTINGS = Object.freeze({
  allowForbiddenPositions: true,
  allowForbiddenReasons: true,
  computerDifficulty: COMPUTER_DIFFICULTY.NORMAL,
  explainForbiddenReasons: true,
  gameMode: OMOK_MODE.STANDARD,
  playerStoneChoice: PLAYER_STONE_CHOICE.RANDOM,
  showForbiddenPositions: true,
});

export function getStoneLabel(stone) {
  return stone === STONE.BLACK ? "흑" : "백";
}

export function getEnabledLabel(enabled) {
  return enabled ? "켜짐" : "꺼짐";
}

export function getAllowedLabel(allowed) {
  return allowed ? "허용" : "허용 안 함";
}

export function getCompactRuleSummaryText({ explainForbiddenReasons, gameMode, showForbiddenPositions }) {
  const hasGuide = gameMode === OMOK_MODE.STANDARD && (showForbiddenPositions || explainForbiddenReasons);
  return `${OMOK_MODE_LABEL[gameMode]} · ${hasGuide ? "금수 도움 사용 중" : "금수 도움 사용 안 함"}`;
}

export function getRoomRuleSummaryText(room) {
  return `${OMOK_MODE_LABEL[room.gameMode]} · 금수 위치 보기 ${getAllowedLabel(room.allowForbiddenPositions)} · 금수 이유 설명 ${getAllowedLabel(room.allowForbiddenReasons)}`;
}

export function getPlayerGuideSummaryText(player) {
  return `금수 위치 표시 ${getEnabledLabel(player.showForbiddenPositions)} · 금수 이유 설명 ${getEnabledLabel(player.explainForbiddenReasons)}`;
}

export function getResultCopy({ activeMatch, draw, resultReason, winner }) {
  if (draw) {
    return {
      title: "무승부",
      description: "더 둘 수 있는 교차점이 없습니다.",
    };
  }

  if (!winner) return null;

  const winnerLabel = getStoneLabel(winner);
  if (activeMatch.matchType === MATCH_TYPE.COMPUTER) {
    return {
      title: winner === activeMatch.playerStone ? "승리!" : "패배",
      description: resultReason === OMOK_RESULT_REASON.RESIGN
        ? "기권으로 대국이 종료되었습니다."
        : `${winnerLabel}이 다섯 돌을 완성했습니다.`,
    };
  }

  return {
    title: `${winnerLabel} 승리`,
    description: resultReason === OMOK_RESULT_REASON.RESIGN
      ? "기권으로 대국이 종료되었습니다."
      : `${winnerLabel}이 다섯 돌을 완성했습니다.`,
  };
}

export function getOnlineResultCopy({ draw, playerStone, resultReason, winner }) {
  if (draw) {
    return {
      title: "무승부",
      description: "더 둘 수 있는 교차점이 없습니다.",
    };
  }

  if (!winner) return null;

  return {
    title: winner === playerStone ? "승리!" : "패배",
    description: resultReason === OMOK_RESULT_REASON.RESIGN
      ? "기권으로 대국이 종료되었습니다."
      : `${getStoneLabel(winner)}이 다섯 돌을 완성했습니다.`,
  };
}
