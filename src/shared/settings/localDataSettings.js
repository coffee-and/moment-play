const MOMENT_PLAY_STORAGE_PREFIX = "eunContents.";

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
      if (!key || !key.startsWith(MOMENT_PLAY_STORAGE_PREFIX)) continue;
      keysToRemove.push(key);
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
    return keysToRemove.length;
  } catch {
    throw new Error("Local storage is unavailable");
  }
}
