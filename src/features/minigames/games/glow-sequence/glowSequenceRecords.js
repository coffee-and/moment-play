import { GAME_RECORD_STORAGE_KEYS } from "../../../../shared/storage/localStorageRegistry.js";
import { GLOW_SEQUENCE_MASTER_END_ROUND } from "./glowSequence.config.js";

export function readGlowSequenceBestRound() {
  try {
    const value = Number(window.localStorage.getItem(GAME_RECORD_STORAGE_KEYS.GLOW_SEQUENCE_BEST_ROUND));
    return Number.isFinite(value)
      ? Math.min(GLOW_SEQUENCE_MASTER_END_ROUND, Math.max(0, Math.floor(value)))
      : 0;
  } catch {
    return 0;
  }
}

export function saveGlowSequenceBestRound(round) {
  try {
    window.localStorage.setItem(GAME_RECORD_STORAGE_KEYS.GLOW_SEQUENCE_BEST_ROUND, String(round));
  } catch {
    // Local progress is optional.
  }
}
