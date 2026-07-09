export const SUDOKU_RECORDS_KEY = "eunContents.sudoku.records";

export const SUDOKU_BOARD_SIZE = 9;
export const SUDOKU_BOX_SIZE = 3;
export const SUDOKU_CELL_COUNT = SUDOKU_BOARD_SIZE * SUDOKU_BOARD_SIZE;
export const SUDOKU_NUMBERS = Array.from({ length: SUDOKU_BOARD_SIZE }, (_, index) => index + 1);

export const SUDOKU_LEVEL = {
  EASY: "easy",
  MEDIUM: "medium",
  ADVANCED: "advanced",
};

export const SUDOKU_LEVEL_ORDER = [SUDOKU_LEVEL.EASY, SUDOKU_LEVEL.MEDIUM, SUDOKU_LEVEL.ADVANCED];

export const SUDOKU_LEVEL_OPTIONS = [
  { id: SUDOKU_LEVEL.EASY, label: "초급", description: "기본 규칙에 익숙해지는 퍼즐" },
  { id: SUDOKU_LEVEL.MEDIUM, label: "중급", description: "조금 더 촘촘하게 생각하는 퍼즐" },
  { id: SUDOKU_LEVEL.ADVANCED, label: "고급", description: "끝까지 집중해서 완성하는 퍼즐" },
];

export const SUDOKU_PHASE = {
  IDLE: "idle",
  PLAYING: "playing",
  COMPLETED: "completed",
  RESET_CONFIRM: "reset-confirm",
};

export const SUDOKU_COPY = {
  start: {
    eyebrow: "LEVEL",
    title: "오늘의 스도쿠를 시작해요",
    description: "규칙에 맞게 빈칸을 채워보세요.",
  },
  actions: {
    newGame: "새 게임",
    keepPlaying: "계속 풀기",
    chooseLevel: "난이도 선택",
  },
  meta: {
    completed: "완료 수",
    bestTime: "최고 기록",
    currentTime: "현재 시간",
    emptyBestTime: "--:--",
  },
  status: {
    idle: "대기 중",
    playing: "진행 중",
    completed: "완료",
    "reset-confirm": "새 게임 확인",
  },
  numberPadLabel: "스도쿠 숫자 입력",
  eraseLabel: "선택한 칸 지우기",
  completed: {
    eyebrow: "CLEAR",
    bestTime: "이번 기록",
    nextLevelTitle: "{level}에 도전할까요?",
    nextLevelDescription: "좋아요. 다음 난이도로 이어서 도전해볼 수 있어요.",
    nextLevelButton: "{level} 도전",
    retryAdvancedTitle: "한 판 더 도전할까요?",
    retryAdvancedDescription: "고급 퍼즐을 한 번 더 시작해볼 수 있어요.",
    retryAdvancedButton: "한 판 더",
  },
  reset: {
    title: "새 게임을 시작할까요?",
    description: "현재 입력한 숫자는 사라지고 같은 난이도로 다시 시작합니다.",
    confirm: "새 게임",
  },
};

export const DEFAULT_SUDOKU_GAME_META = {
  eyebrow: "NUMBER / LOGIC",
  title: "스도쿠",
  description: "가로·세로·영역의 숫자를 완성하세요.",
};
