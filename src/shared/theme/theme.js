export const THEME = Object.freeze({
  LIGHT: "light",
  DARK: "dark",
});

export const THEME_STORAGE_KEY = "momentPlay.theme";

export function isTheme(value) {
  return value === THEME.LIGHT || value === THEME.DARK;
}

function getBrowserStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function getDocumentRoot() {
  if (typeof document === "undefined") return null;
  return document.documentElement;
}

export function readStoredTheme(storage = getBrowserStorage()) {
  if (!storage) return null;

  try {
    const storedTheme = storage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

export function getInitialTheme({
  root = getDocumentRoot(),
  storage = getBrowserStorage(),
} = {}) {
  const activeTheme = root?.dataset.theme;
  if (isTheme(activeTheme)) return activeTheme;
  return readStoredTheme(storage) ?? THEME.LIGHT;
}

export function applyTheme(theme, root = getDocumentRoot()) {
  if (!root || !isTheme(theme)) return;

  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  if (typeof document === "undefined") return;
  const themeColor = getComputedStyle(root).backgroundColor;
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColor && themeColorMeta) themeColorMeta.setAttribute("content", themeColor);
}

export function storeTheme(theme, storage = getBrowserStorage()) {
  if (!storage || !isTheme(theme)) return;

  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // A theme change should still work when storage is blocked or unavailable.
  }
}

export function initializeTheme() {
  const theme = getInitialTheme();
  applyTheme(theme);
  return theme;
}
