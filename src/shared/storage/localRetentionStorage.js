const STORAGE_VERSION = 1;

function isStorageAvailable() {
  if (typeof window === "undefined") return false;
  try {
    const probeKey = "eunContents.storageProbe";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

// Reads a { data, lastActiveAt, version } envelope, treating it as absent once
// `maxAgeMs` has elapsed since the last recorded activity. Clears only the
// specific expired key it was asked to read - never scans/clears other keys.
export function readRetainedData(key, { maxAgeMs }) {
  if (!isStorageAvailable()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const envelope = JSON.parse(raw);
    if (!envelope || typeof envelope !== "object") return null;
    if (envelope.version !== STORAGE_VERSION) return null;

    const lastActiveAt = Number(envelope.lastActiveAt);
    if (!Number.isFinite(lastActiveAt)) return null;

    if (Date.now() - lastActiveAt > maxAgeMs) {
      window.localStorage.removeItem(key);
      return null;
    }

    return envelope.data ?? null;
  } catch {
    return null;
  }
}

export function writeRetainedData(key, data) {
  if (!isStorageAvailable()) return;

  try {
    const envelope = {
      data,
      lastActiveAt: Date.now(),
      version: STORAGE_VERSION,
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // noop - storage may be unavailable (private browsing, quota, etc.)
  }
}

// Refreshes lastActiveAt without changing the stored data, for activity that
// isn't itself a data update (e.g. actually playing a match).
export function touchRetainedData(key) {
  if (!isStorageAvailable()) return;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;

    const envelope = JSON.parse(raw);
    if (!envelope || typeof envelope !== "object") return;

    envelope.lastActiveAt = Date.now();
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // noop
  }
}
