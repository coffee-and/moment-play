import { GAME_2048_BEST_SCORE_KEY } from "../games/game-2048/game2048.constants.js";
import { MEMORY_BEST_ROUND_KEY } from "../games/memory/MemoryOrderGame.jsx";
import { readRecords as readSudokuRecords } from "../games/sudoku/SudokuLevelGame.jsx";
import { SUDOKU_LEVEL_OPTIONS } from "../games/sudoku/sudoku.constants.js";

function readNumber(key) {
  if (typeof window === "undefined") return null;
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function formatSeconds(seconds) {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function get2048Record() {
  const bestScore = readNumber(GAME_2048_BEST_SCORE_KEY);
  if (bestScore === null) return null;
  return [{ label: "최고 점수", value: bestScore.toLocaleString() }];
}

function getMemoryRecord() {
  const bestRound = readNumber(MEMORY_BEST_ROUND_KEY);
  if (bestRound === null) return null;
  return [{ label: "최고 라운드", value: `${bestRound}라운드` }];
}

function getSudokuRecord() {
  const records = readSudokuRecords();
  if (!records.completedCount) return null;
  const stats = [{ label: "완료 수", value: `${records.completedCount}회` }];
  SUDOKU_LEVEL_OPTIONS.forEach(({ id, label }) => {
    const bestTimeSeconds = records.byLevel?.[id]?.bestTimeSeconds;
    if (bestTimeSeconds) {
      stats.push({ label: `${label} 최고 기록`, value: formatSeconds(bestTimeSeconds) });
    }
  });
  return stats;
}

// Omok has no persisted record today (status is "inProgress" / UI preview only).
function getOmokRecord() {
  return null;
}

const RECORD_READERS = {
  "2048": get2048Record,
  memory: getMemoryRecord,
  sudoku: getSudokuRecord,
  omok: getOmokRecord,
};

export function getGamePersonalRecord(gameId) {
  const reader = RECORD_READERS[gameId];
  return reader ? reader() : null;
}
