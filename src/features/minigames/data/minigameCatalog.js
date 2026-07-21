export const MINIGAME_STATUS = {
  AVAILABLE: "available",
  COMING_SOON: "comingSoon",
};

export const MINIGAMES_PATH = "/games";

export const MINIGAME_CATALOG = [
  {
    id: "2048",
    title: "2048",
    description: "같은 숫자 타일을 합쳐 목표 타일까지 도전해요.",
    cardDescription: "같은 숫자를 합쳐 목표 타일까지",
    homeCardDescription: "숫자를 합쳐 목표 타일까지 도전해요.",
    howTo: "방향키 또는 스와이프로 타일을 이동해 합치세요.",
    status: MINIGAME_STATUS.AVAILABLE,
    route: "/minigames/2048",
    category: "Number",
    recordType: "score",
    rankingType: "highScore",
  },
  {
    id: "memory",
    title: "Memory Sequence",
    description: "순서를 기억하고 같은 순서로 선택해요.",
    cardDescription: "컬러 아이콘의 순서를 기억해요.",
    homeCardDescription: "별과 꽃의 순서를 기억해보세요.",
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
    cardDescription: "연한 격자에 숫자를 채워요.",
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
    cardDescription: "흑과 백으로 다섯 돌을 이어요.",
    howTo: "교차점을 선택해 돌을 놓고, Standard Omok에서는 흑의 금수 자리를 피하세요.",
    status: MINIGAME_STATUS.AVAILABLE,
    route: "/minigames/omok",
    category: "Board",
    recordType: "winRate",
    rankingType: "winRate",
  },
  {
    id: "flappy",
    title: "Star Flight",
    description: "날개를 펼쳐 빛의 기둥 사이를 통과하며 오래 비행해요.",
    cardDescription: "빛 기둥 사이를 오래 비행해요.",
    howTo: "화면을 탭하거나 Space·Enter를 눌러 날아오르고 기둥과 경계를 피하세요.",
    status: MINIGAME_STATUS.AVAILABLE,
    route: "/minigames/flappy",
    category: "Arcade",
    recordType: null,
    rankingType: null,
  },
  {
    id: "timing-tap",
    title: "Timing Tap",
    description: "움직이는 바를 목표 구간에 정확히 멈춰 반응 속도를 시험해요.",
    cardDescription: "목표 구간에 정확히 멈춰요.",
    howTo: "목표 구간과 바가 겹치는 순간 화면이나 Space·Enter를 누르세요.",
    status: MINIGAME_STATUS.AVAILABLE,
    route: "/minigames/timing-tap",
    category: "Reaction",
    recordType: null,
    rankingType: null,
  },
  {
    id: "glow-sequence",
    title: "Glow Sequence",
    description: "빛나는 칸의 위치와 순서를 기억해 마지막 25칸까지 도전해요.",
    cardDescription: "빛나는 칸의 순서를 기억해요.",
    homeCardDescription: "빛의 순서를 기억해 끝까지 이어보세요.",
    howTo: "빛나는 칸을 순서대로 기억한 뒤 같은 위치를 차례대로 선택하세요. 25칸 순서를 완성하면 MASTER를 달성해요.",
    status: MINIGAME_STATUS.AVAILABLE,
    route: "/minigames/glow-sequence",
    category: "Memory",
    recordType: "round",
    rankingType: "bestRound",
  },
  {
    id: "color-sort",
    title: "Color Sort",
    description: "색상 블록을 옮겨 각 통을 한 가지 색으로 완성해요.",
    cardDescription: "같은 색끼리 차곡차곡 정리해요.",
    homeCardDescription: "흩어진 색상 블록을 같은 색끼리 모아보세요.",
    howTo: "옮길 통과 도착할 통을 차례로 선택하세요. 맨 위의 같은 색 블록은 빈 통이나 같은 색 위로만 이동할 수 있어요.",
    status: MINIGAME_STATUS.AVAILABLE,
    route: "/minigames/color-sort",
    category: "Puzzle",
    recordType: null,
    rankingType: null,
  },
];

export const MINIGAME_CATEGORY_ORDER = ["All", "Number", "Memory", "Puzzle", "Board", "Arcade", "Reaction"];

export const DEFAULT_MINIGAME_ID =
  MINIGAME_CATALOG.find((game) => game.status === MINIGAME_STATUS.AVAILABLE)?.id ?? MINIGAME_CATALOG[0]?.id;

export function getMinigameById(id) {
  return MINIGAME_CATALOG.find((game) => game.id === id) ?? null;
}
