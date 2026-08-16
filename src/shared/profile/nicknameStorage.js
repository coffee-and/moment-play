import { readRetainedData, writeRetainedData } from "../storage/localRetentionStorage.js";
import { LOCAL_STORAGE_KEYS } from "../storage/localStorageRegistry.js";

// Shared across every Moment Play game. Storage-only: callers are responsible
// for normalizing/validating a nickname before saving it here.
const LOCAL_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

export function getLocalNickname() {
  const data = readRetainedData(LOCAL_STORAGE_KEYS.PROFILE_NICKNAME, { maxAgeMs: LOCAL_MAX_AGE_MS });
  return typeof data?.nickname === "string" ? data.nickname : null;
}

export function saveLocalNickname(nickname) {
  const data = readRetainedData(LOCAL_STORAGE_KEYS.PROFILE_NICKNAME, { maxAgeMs: LOCAL_MAX_AGE_MS }) ?? {};
  writeRetainedData(LOCAL_STORAGE_KEYS.PROFILE_NICKNAME, { ...data, nickname });
}

export function getLocalPlayerTwoNickname() {
  const data = readRetainedData(LOCAL_STORAGE_KEYS.PROFILE_NICKNAME, { maxAgeMs: LOCAL_MAX_AGE_MS });
  return typeof data?.playerTwoNickname === "string" ? data.playerTwoNickname : null;
}

export function saveLocalPlayerTwoNickname(playerTwoNickname) {
  const data = readRetainedData(LOCAL_STORAGE_KEYS.PROFILE_NICKNAME, { maxAgeMs: LOCAL_MAX_AGE_MS }) ?? {};
  writeRetainedData(LOCAL_STORAGE_KEYS.PROFILE_NICKNAME, { ...data, playerTwoNickname });
}
