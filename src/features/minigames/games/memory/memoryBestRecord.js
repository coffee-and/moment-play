import { GAME_RECORD_STORAGE_KEYS } from "../../../../shared/storage/localStorageRegistry.js";

export function readMemoryBestRound() {
  try {
    const value = Number(window.localStorage.getItem(GAME_RECORD_STORAGE_KEYS.MEMORY_BEST_ROUND));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveMemoryBestRound(round) {
  try {
    window.localStorage.setItem(GAME_RECORD_STORAGE_KEYS.MEMORY_BEST_ROUND, String(round));
  } catch {
    // Local records are optional when storage is unavailable.
  }
}
