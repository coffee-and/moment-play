export const RANKING_PATH = "/ranking";

export const RANKING_GAME = {
  GAME_2048: "2048",
  MEMORY: "memory",
  SUDOKU: "sudoku",
  OMOK: "omok",
};

export const RANKING_GAME_OPTIONS = [
  { id: RANKING_GAME.GAME_2048, label: "2048", valueLabel: "점수" },
  { id: RANKING_GAME.MEMORY, label: "Memory Order", valueLabel: "완료 라운드" },
  { id: RANKING_GAME.SUDOKU, label: "Sudoku", valueLabel: "완료 시간" },
  { id: RANKING_GAME.OMOK, label: "Omok", valueLabel: "결과" },
];

export const SUDOKU_RANKING_MODES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "advanced", label: "Advanced" },
];

export function getRankingModeLabel(mode) {
  return SUDOKU_RANKING_MODES.find((option) => option.id === mode)?.label ?? mode ?? "-";
}

export function formatRankingValue(entry) {
  if (entry.gameKey === RANKING_GAME.GAME_2048) return entry.scoreValue.toLocaleString("ko-KR");
  if (entry.gameKey === RANKING_GAME.MEMORY) return `${entry.scoreValue}R`;
  if (entry.gameKey === RANKING_GAME.SUDOKU) {
    const totalSeconds = Math.round(entry.durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
  }
  return entry.matchResult ?? "-";
}

export function formatRankingDate(createdAt) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(createdAt));
}
