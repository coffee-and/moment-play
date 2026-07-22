export const OMOK_BOARD_SIZE = 15;
export const OMOK_TOTAL_CELLS = OMOK_BOARD_SIZE * OMOK_BOARD_SIZE;
export const OMOK_COMPUTER_MOVE_DELAY_MS = 420;

export const STONE = Object.freeze({
  BLACK: "black",
  WHITE: "white",
});

export const OMOK_MODE = Object.freeze({
  STANDARD: "standard",
  FREE: "free",
});

export const MATCH_TYPE = Object.freeze({
  LOCAL: "local",
  COMPUTER: "computer",
  ONLINE: "online",
});

export const COMPUTER_DIFFICULTY = Object.freeze({
  EASY: "easy",
  NORMAL: "normal",
  HARD: "hard",
});

export const PLAYER_STONE_CHOICE = Object.freeze({
  BLACK: STONE.BLACK,
  WHITE: STONE.WHITE,
  RANDOM: "random",
});

export const FORBIDDEN_REASON = Object.freeze({
  DOUBLE_THREE: "double-three",
  DOUBLE_FOUR: "double-four",
  OVERLINE: "overline",
});

export const MOVE_REJECTION_REASON = Object.freeze({
  OCCUPIED: "occupied",
  OUT_OF_BOUNDS: "out-of-bounds",
  ...FORBIDDEN_REASON,
});

export const OMOK_RESULT_REASON = Object.freeze({
  WIN: "win",
  DRAW: "draw",
  RESIGN: "resign",
});

export const OMOK_MODE_LABEL = Object.freeze({
  [OMOK_MODE.STANDARD]: "Standard Omok",
  [OMOK_MODE.FREE]: "Free Omok",
});

export const OMOK_MODE_COMPACT_LABEL = Object.freeze({
  [OMOK_MODE.STANDARD]: "STANDARD",
  [OMOK_MODE.FREE]: "FREE",
});

export const MATCH_TYPE_LABEL = Object.freeze({
  [MATCH_TYPE.LOCAL]: "Local match",
  [MATCH_TYPE.COMPUTER]: "Computer match",
  [MATCH_TYPE.ONLINE]: "Online room",
});

export const MATCH_TYPE_COMPACT_LABEL = Object.freeze({
  [MATCH_TYPE.LOCAL]: "LOCAL",
  [MATCH_TYPE.COMPUTER]: "AI",
  [MATCH_TYPE.ONLINE]: "FRIEND",
});

export const COMPUTER_DIFFICULTY_LABEL = Object.freeze({
  [COMPUTER_DIFFICULTY.EASY]: "Easy",
  [COMPUTER_DIFFICULTY.NORMAL]: "Normal",
  [COMPUTER_DIFFICULTY.HARD]: "Hard",
});

export const PLAYER_STONE_CHOICE_LABEL = Object.freeze({
  [PLAYER_STONE_CHOICE.BLACK]: "Black",
  [PLAYER_STONE_CHOICE.WHITE]: "White",
  [PLAYER_STONE_CHOICE.RANDOM]: "Random",
});

export const FORBIDDEN_REASON_LABEL = Object.freeze({
  [FORBIDDEN_REASON.DOUBLE_THREE]: "쌍삼 자리입니다.",
  [FORBIDDEN_REASON.DOUBLE_FOUR]: "쌍사 자리입니다.",
  [FORBIDDEN_REASON.OVERLINE]: "장목 자리입니다.",
});

export const OMOK_RULE_DETAILS = Object.freeze({
  [OMOK_MODE.STANDARD]: [
    "흑이 먼저 시작",
    "흑은 3-3, 4-4, 장목 금지",
    "흑은 정확히 5목일 때 승리",
    "백은 5목 이상이면 승리",
  ],
  [OMOK_MODE.FREE]: [
    "흑과 백 모두 금수 없음",
    "흑과 백 모두 5목 이상이면 승리",
  ],
});
