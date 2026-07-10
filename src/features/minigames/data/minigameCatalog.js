export const MINIGAME_STATUS = {
  AVAILABLE: "available",
  COMING_SOON: "comingSoon",
  IN_PROGRESS: "inProgress",
};

// Card CTA label ("View Details" for playable games, etc.)
export const STATUS_CTA_LABEL = {
  [MINIGAME_STATUS.AVAILABLE]: "View Details",
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
    icon: "2048",
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
    icon: "SEQ",
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
    icon: "SDK",
    category: "Puzzle",
    recordType: "time",
    rankingType: "bestTime",
  },
  {
    id: "omok",
    title: "Omok",
    description: "초대 또는 매칭으로 이어질 1:1 보드 UI예요.",
    howTo: "보드를 클릭해 돌을 놓는 UI 미리보기예요.",
    status: MINIGAME_STATUS.IN_PROGRESS,
    route: "/minigames/omok",
    icon: "5",
    category: "Online",
    recordType: "winRate",
    rankingType: "winRate",
  },
  {
    id: "future-puzzle",
    title: "Future Puzzle",
    description: "다음 미니게임을 위한 준비 슬롯이에요.",
    howTo: null,
    status: MINIGAME_STATUS.COMING_SOON,
    route: "/minigames/future-puzzle",
    icon: "+",
    category: "Puzzle",
    recordType: null,
    rankingType: null,
  },
];

export const DEFAULT_MINIGAME_ID =
  MINIGAME_CATALOG.find((game) => game.status === MINIGAME_STATUS.AVAILABLE)?.id ?? MINIGAME_CATALOG[0]?.id;

export function getMinigameById(id) {
  return MINIGAME_CATALOG.find((game) => game.id === id) ?? null;
}
