export const MINIGAME_STATUS = {
  AVAILABLE: "available",
  COMING_SOON: "comingSoon",
  IN_PROGRESS: "inProgress",
};

// Compact action label for playable game cards.
export const STATUS_CTA_LABEL = {
  [MINIGAME_STATUS.AVAILABLE]: "Play",
  [MINIGAME_STATUS.COMING_SOON]: "Coming Soon",
  [MINIGAME_STATUS.IN_PROGRESS]: "Preview",
};

// Small mode badge shown on the card (top-right of the CTA row).
export const STATUS_BADGE_LABEL = {
  [MINIGAME_STATUS.AVAILABLE]: "Solo",
  [MINIGAME_STATUS.COMING_SOON]: "Soon",
  [MINIGAME_STATUS.IN_PROGRESS]: "Next logic",
};

// Detail-section status blurb.
export const STATUS_PLAY_LABEL = {
  [MINIGAME_STATUS.AVAILABLE]: "Now playing",
  [MINIGAME_STATUS.COMING_SOON]: "Coming soon",
  [MINIGAME_STATUS.IN_PROGRESS]: "UI first",
};

// Detail-section "Play Game" button label.
export const STATUS_PLAY_BUTTON_LABEL = {
  [MINIGAME_STATUS.AVAILABLE]: "Play Game",
  [MINIGAME_STATUS.COMING_SOON]: "Coming Soon",
  [MINIGAME_STATUS.IN_PROGRESS]: "View Game Screen",
};

export const MINIGAME_CATALOG = [
  {
    id: "2048",
    title: "2048",
    description: "같은 숫자 타일을 합쳐 목표 타일까지 도전해요.",
    howTo: "방향키 또는 스와이프로 타일을 이동해 합치세요.",
    status: MINIGAME_STATUS.AVAILABLE,
    route: "/minigames/2048",
    category: "Number",
    recordType: "score",
    rankingType: "highScore",
  },
  {
    id: "memory",
    title: "순서 맞추기",
    description: "순서를 기억하고 같은 순서로 선택해요.",
    howTo: "제시된 순서를 기억한 뒤 같은 순서로 선택하세요.",
    status: MINIGAME_STATUS.AVAILABLE,
    route: "/minigames/memory",
    category: "Memory",
    recordType: "round",
    rankingType: "bestRound",
  },
  {
    id: "sudoku",
    title: "Sudoku",
    description: "난이도별 퍼즐을 풀고 최고 시간을 줄여요.",
    howTo: "빈칸을 선택하고 숫자를 입력해 가로·세로·영역을 완성하세요.",
    status: MINIGAME_STATUS.AVAILABLE,
    route: "/minigames/sudoku",
    category: "Puzzle",
    recordType: "time",
    rankingType: "bestTime",
  },
  {
    id: "omok",
    title: "Omok",
    description: "로컬 대국과 컴퓨터 대전으로 다섯 돌을 먼저 완성해요.",
    howTo: "교차점을 선택해 돌을 놓고, Standard Omok에서는 흑의 금수 자리를 피하세요.",
    status: MINIGAME_STATUS.AVAILABLE,
    route: "/minigames/omok",
    category: "Board",
    recordType: "winRate",
    rankingType: "winRate",
  },
  {
    id: "timing-tap",
    title: "타이밍 탭",
    description: "움직이는 바를 목표 구간에 정확히 멈춰 반응 속도를 시험해요.",
    howTo: "목표 구간과 바가 겹치는 순간 화면이나 Space·Enter를 누르세요.",
    status: MINIGAME_STATUS.AVAILABLE,
    route: "/minigames/timing-tap",
    category: "Reaction",
    recordType: null,
    rankingType: null,
  },
  {
    id: "flappy",
    title: "별빛 비행",
    description: "날개를 펼쳐 빛의 기둥 사이를 통과하며 오래 비행해요.",
    howTo: "화면을 탭하거나 Space·Enter를 눌러 날아오르고 기둥과 경계를 피하세요.",
    status: MINIGAME_STATUS.AVAILABLE,
    route: "/minigames/flappy",
    category: "Arcade",
    recordType: null,
    rankingType: null,
  },
];

export const DEFAULT_MINIGAME_ID =
  MINIGAME_CATALOG.find((game) => game.status === MINIGAME_STATUS.AVAILABLE)?.id ?? MINIGAME_CATALOG[0]?.id;

export function getMinigameById(id) {
  return MINIGAME_CATALOG.find((game) => game.id === id) ?? null;
}
