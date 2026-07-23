import { readRetainedData, writeRetainedData } from "../storage/localRetentionStorage.js";

// Shared across every Moment Play game. Storage-only: callers are responsible
// for normalizing/validating a nickname before saving it here.
const NICKNAME_KEY = "eunContents.profile.nickname";
const LOCAL_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

export function getLocalNickname() {
  const data = readRetainedData(NICKNAME_KEY, { maxAgeMs: LOCAL_MAX_AGE_MS });
  return typeof data?.nickname === "string" ? data.nickname : null;
}

export function saveLocalNickname(nickname) {
  const data = readRetainedData(NICKNAME_KEY, { maxAgeMs: LOCAL_MAX_AGE_MS }) ?? {};
  writeRetainedData(NICKNAME_KEY, { ...data, nickname });
}

export function getLocalPlayerTwoNickname() {
  const data = readRetainedData(NICKNAME_KEY, { maxAgeMs: LOCAL_MAX_AGE_MS });
  return typeof data?.playerTwoNickname === "string" ? data.playerTwoNickname : null;
}

export function saveLocalPlayerTwoNickname(playerTwoNickname) {
  const data = readRetainedData(NICKNAME_KEY, { maxAgeMs: LOCAL_MAX_AGE_MS }) ?? {};
  writeRetainedData(NICKNAME_KEY, { ...data, playerTwoNickname });
}
