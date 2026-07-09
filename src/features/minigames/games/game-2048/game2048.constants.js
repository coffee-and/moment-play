export const GAME_2048_BEST_SCORE_KEY = "eunContents.game2048.bestScore";

export const BOARD_SIZE = 4;
export const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE;
export const TARGET_TILES = [128, 256, 512, 1024, 2048];
export const FINAL_TARGET_TILE = TARGET_TILES[TARGET_TILES.length - 1];
export const SWIPE_THRESHOLD = 28;
export const SWIPE_AXIS_DELTA = 8;

export const GAME_2048_COPY = {
  guidance: {
    move: "방향키 또는 스와이프로 이동하세요.",
    gameOverRule: "더 이상 움직일 수 없으면 게임이 종료됩니다.",
  },
  start: {
    eyebrow: "목표 달성하기",
    targetLabel: "TARGET",
    description: "같은 숫자를 합쳐 첫 목표 타일을 완성해 보세요.",
    startButton: "게임 시작",
  },
  milestone: {
    nextTargetLabel: "NEXT TARGET",
    nextButtonLabel: "다음 목표",
  },
  completed: {
    eyebrow: "✦ CLEAR ✦",
    title: "COMPLETE",
    description: "모든 목표 타일을 완성했어요.",
    detail: "원하면 이어서 더 높은 타일까지 계속 도전할 수 있어요.",
    continueButton: "계속 플레이",
    newGameButton: "새 게임",
  },
  gameOver: {
    title: "GAME OVER",
    scoreLabel: "최종 점수",
    maxTileLabel: "최대 타일",
    newGameButton: "새 게임",
  },
  reset: {
    title: "새 게임을 시작할까요?",
    description: "현재 보드와 점수가 초기화됩니다. 최고 점수는 유지됩니다.",
    continueButton: "계속 플레이",
    newGameButton: "새 게임",
  },
};

export const GAME_2048_PHASE = {
  IDLE: "idle",
  PLAYING: "playing",
  MILESTONE_CLEAR: "milestone-clear",
  COMPLETED: "completed",
  ENDLESS: "endless",
  GAME_OVER: "game-over",
};

export const GAME_2048_DIRECTION = {
  UP: "up",
  RIGHT: "right",
  DOWN: "down",
  LEFT: "left",
};
