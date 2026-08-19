import { GAME_RECORD_STORAGE_KEYS } from "../../../../shared/storage/localStorageRegistry.js";
import { SOLITAIRE_DIFFICULTY } from "./solitaire.logic.js";

export const EMPTY_DIFFICULTY_RECORD = { bestTimeSeconds: null, completedCount: 0 };

function createEmptyRecords() {
  return {
    [SOLITAIRE_DIFFICULTY.EASY]: { ...EMPTY_DIFFICULTY_RECORD },
    [SOLITAIRE_DIFFICULTY.HARD]: { ...EMPTY_DIFFICULTY_RECORD },
  };
}

function normalizeDifficultyRecord(value) {
  const bestTimeSeconds = Number(value?.bestTimeSeconds);
  const completedCount = Number(value?.completedCount);
  return {
    bestTimeSeconds: Number.isFinite(bestTimeSeconds) && bestTimeSeconds > 0 ? bestTimeSeconds : null,
    completedCount: Number.isFinite(completedCount) && completedCount > 0 ? completedCount : 0,
  };
}

export function readSolitaireRecords() {
  if (typeof window === "undefined") return createEmptyRecords();
  try {
    const stored = JSON.parse(window.localStorage.getItem(GAME_RECORD_STORAGE_KEYS.SOLITAIRE_RECORDS));
    return {
      [SOLITAIRE_DIFFICULTY.EASY]: normalizeDifficultyRecord(stored?.[SOLITAIRE_DIFFICULTY.EASY]),
      [SOLITAIRE_DIFFICULTY.HARD]: normalizeDifficultyRecord(stored?.[SOLITAIRE_DIFFICULTY.HARD]),
    };
  } catch {
    return createEmptyRecords();
  }
}

export function saveSolitaireRecords(records) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GAME_RECORD_STORAGE_KEYS.SOLITAIRE_RECORDS, JSON.stringify(records));
  } catch {
    // Local records are optional when browser storage is unavailable.
  }
}
