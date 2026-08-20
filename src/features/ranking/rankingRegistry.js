export const RANKING_PATH = "/ranking";

export const RANKING_GAME = Object.freeze({
  GAME_2048: "2048",
  MEMORY: "memory",
  STAR_FLIGHT: "flappy",
  SUDOKU: "sudoku",
});

export const RANKING_CHALLENGE = Object.freeze({
  ALL_TIME: "all-time",
});

const RULES_VERSION = "1";

function createBoard(gameKey, boardKey, label, valueLabel, metricKey, formatValue) {
  return Object.freeze({
    boardKey,
    challengeKey: RANKING_CHALLENGE.ALL_TIME,
    formatValue,
    gameKey,
    label,
    metricKey,
    rulesVersion: RULES_VERSION,
    valueLabel,
  });
}

function formatScore(value) {
  return Number(value ?? 0).toLocaleString("ko-KR");
}

function formatDuration(value) {
  const totalSeconds = Math.max(0, Math.round(Number(value ?? 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export const RANKING_BOARD = Object.freeze({
  GAME_2048_CLASSIC: createBoard(
    RANKING_GAME.GAME_2048,
    "classic",
    "Classic",
    "점수",
    "score",
    formatScore,
  ),
  MEMORY_STANDARD: createBoard(
    RANKING_GAME.MEMORY,
    "standard",
    "Standard",
    "점수",
    "score",
    formatScore,
  ),
  STAR_FLIGHT_COURSE: createBoard(
    RANKING_GAME.STAR_FLIGHT,
    "course",
    "Course",
    "점수",
    "courseScore",
    formatScore,
  ),
  STAR_FLIGHT_ENDLESS: createBoard(
    RANKING_GAME.STAR_FLIGHT,
    "endless",
    "Endless",
    "생존 시간",
    "survivalMs",
    formatDuration,
  ),
  SUDOKU_EASY: createBoard(
    RANKING_GAME.SUDOKU,
    "easy",
    "Easy",
    "완료 시간",
    "durationMs",
    formatDuration,
  ),
  SUDOKU_MEDIUM: createBoard(
    RANKING_GAME.SUDOKU,
    "medium",
    "Medium",
    "완료 시간",
    "durationMs",
    formatDuration,
  ),
  SUDOKU_ADVANCED: createBoard(
    RANKING_GAME.SUDOKU,
    "advanced",
    "Advanced",
    "완료 시간",
    "durationMs",
    formatDuration,
  ),
});

export const RANKING_GAMES = Object.freeze([
  Object.freeze({
    gameKey: RANKING_GAME.GAME_2048,
    label: "2048",
    boards: Object.freeze([RANKING_BOARD.GAME_2048_CLASSIC]),
  }),
  Object.freeze({
    gameKey: RANKING_GAME.MEMORY,
    label: "Memory Order",
    boards: Object.freeze([RANKING_BOARD.MEMORY_STANDARD]),
  }),
  Object.freeze({
    gameKey: RANKING_GAME.STAR_FLIGHT,
    label: "Star Flight",
    boards: Object.freeze([
      RANKING_BOARD.STAR_FLIGHT_COURSE,
      RANKING_BOARD.STAR_FLIGHT_ENDLESS,
    ]),
  }),
  Object.freeze({
    gameKey: RANKING_GAME.SUDOKU,
    label: "Sudoku",
    boards: Object.freeze([
      RANKING_BOARD.SUDOKU_EASY,
      RANKING_BOARD.SUDOKU_MEDIUM,
      RANKING_BOARD.SUDOKU_ADVANCED,
    ]),
  }),
]);

export function getRankingGame(gameKey) {
  return RANKING_GAMES.find((game) => game.gameKey === gameKey) ?? null;
}

export function getRankingBoard(gameKey, boardKey) {
  return getRankingGame(gameKey)?.boards.find((board) => board.boardKey === boardKey) ?? null;
}

export function getSudokuRankingBoard(level) {
  return getRankingBoard(RANKING_GAME.SUDOKU, level);
}

export function formatRankingValue(entry, board) {
  return board.formatValue(entry.metrics?.[board.metricKey]);
}

export function formatRankingDate(createdAt) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(createdAt));
}
