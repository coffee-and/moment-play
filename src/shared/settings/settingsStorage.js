import { readRetainedData, writeRetainedData } from "../storage/localRetentionStorage.js";

// Shared across every Moment Play surface (header toggle, Settings page).
// Storage-only: callers own defaults/validation. Preferences are long-lived,
// unlike nickname/game-record caches, so they use a much longer retention window.
const SETTINGS_KEY = "eunContents.settings.preferences";
const LOCAL_MAX_AGE_MS = 3650 * 24 * 60 * 60 * 1000; // ~10 years - effectively "does not expire"

export const DEFAULT_SETTINGS = {
  theme: "dark",
  soundEnabled: true,
  vibrationEnabled: true,
  showGameGuide: true,
};

export function getLocalSettings() {
  const data = readRetainedData(SETTINGS_KEY, { maxAgeMs: LOCAL_MAX_AGE_MS });
  return { ...DEFAULT_SETTINGS, ...(data && typeof data === "object" ? data : {}) };
}

export function saveLocalSettings(partialSettings) {
  const next = { ...getLocalSettings(), ...partialSettings };
  writeRetainedData(SETTINGS_KEY, next);
  return next;
}
