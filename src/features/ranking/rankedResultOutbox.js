import { LOCAL_STORAGE_KEYS } from "../../shared/storage/localStorageRegistry.js";

const MAX_OUTBOX_ITEMS = 12;
const OUTBOX_RETENTION_MS = 24 * 60 * 60 * 1000;

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeCommand(value, now = Date.now()) {
  if (!isRecord(value) || !isRecord(value.proof)) return null;
  const createdAt = Number(value.createdAt);
  if (!Number.isFinite(createdAt) || now - createdAt > OUTBOX_RETENTION_MS) return null;
  if (
    typeof value.attemptId !== "string"
    || typeof value.boardKey !== "string"
    || typeof value.clientSubmissionId !== "string"
    || typeof value.gameKey !== "string"
    || typeof value.rulesVersion !== "string"
    || typeof value.userId !== "string"
  ) return null;

  return {
    attemptId: value.attemptId,
    boardKey: value.boardKey,
    clientSubmissionId: value.clientSubmissionId,
    createdAt,
    gameKey: value.gameKey,
    proof: value.proof,
    rulesVersion: value.rulesVersion,
    userId: value.userId,
  };
}

function readAll() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(LOCAL_STORAGE_KEYS.RANKED_RESULT_OUTBOX) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeCommand(item)).filter(Boolean);
  } catch {
    return [];
  }
}

function writeAll(commands) {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (commands.length === 0) {
      storage.removeItem(LOCAL_STORAGE_KEYS.RANKED_RESULT_OUTBOX);
      return;
    }
    storage.setItem(
      LOCAL_STORAGE_KEYS.RANKED_RESULT_OUTBOX,
      JSON.stringify(commands.slice(-MAX_OUTBOX_ITEMS)),
    );
  } catch {
    // The live request can still finish when persistent storage is unavailable.
  }
}

export function readRankedResultOutbox({ boardKey, gameKey, userId } = {}) {
  const commands = readAll();
  writeAll(commands);
  return commands.filter((command) => (
    (!userId || command.userId === userId)
    && (!gameKey || command.gameKey === gameKey)
    && (!boardKey || command.boardKey === boardKey)
  ));
}

export function storeRankedResultCommand(command) {
  const normalized = normalizeCommand(command);
  if (!normalized) throw new Error("저장할 랭킹 결과 요청이 올바르지 않습니다.");
  const commands = readAll().filter((item) => !(
    item.userId === normalized.userId && item.attemptId === normalized.attemptId
  ));
  writeAll([...commands, normalized]);
  return normalized;
}

export function removeRankedResultCommand({ attemptId, userId }) {
  writeAll(readAll().filter((command) => !(
    command.userId === userId && command.attemptId === attemptId
  )));
}
