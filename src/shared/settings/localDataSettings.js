import {
  RESETTABLE_LOCAL_DATA_KEYS,
  RESETTABLE_LOCAL_DATA_PREFIXES,
} from "../storage/localStorageRegistry.js";

const RESETTABLE_LOCAL_DATA_KEY_SET = new Set(RESETTABLE_LOCAL_DATA_KEYS);

function getBrowserStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function clearMomentPlayLocalData(storage = getBrowserStorage()) {
  if (!storage) throw new Error("Local storage is unavailable");

  try {
    const keysToRemove = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;

      const isRegisteredKey = RESETTABLE_LOCAL_DATA_KEY_SET.has(key);
      const isLegacyPlayData = RESETTABLE_LOCAL_DATA_PREFIXES.some((prefix) => key.startsWith(prefix));
      if (!isRegisteredKey && !isLegacyPlayData) continue;
      keysToRemove.push(key);
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
    return keysToRemove.length;
  } catch {
    throw new Error("Local storage is unavailable");
  }
}
