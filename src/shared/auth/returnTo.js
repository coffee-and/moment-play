import { LOGIN_PATH, SIGNUP_PATH } from "./authConstants.js";

export const DEFAULT_RETURN_TO = "/";

function containsUnsafePathCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint <= 0x1f || codePoint === 0x7f || character === "\\";
  });
}

export function sanitizeReturnTo(value, fallback = DEFAULT_RETURN_TO) {
  if (typeof value !== "string" || !value || value !== value.trim()) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (containsUnsafePathCharacter(value)) return fallback;

  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || containsUnsafePathCharacter(decoded)) {
    return fallback;
  }

  try {
    const base = new URL("https://moment-play.invalid/");
    const resolved = new URL(value, base);
    if (resolved.origin !== base.origin || !resolved.pathname.startsWith("/")) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

export function getReturnToFromSearch(search, fallback = DEFAULT_RETURN_TO) {
  const params = new URLSearchParams(search);
  return sanitizeReturnTo(params.get("returnTo"), fallback);
}

export function buildAuthRoute(path, returnTo = DEFAULT_RETURN_TO) {
  if (path !== LOGIN_PATH && path !== SIGNUP_PATH) {
    throw new Error("Only authentication routes can carry returnTo");
  }
  const safeReturnTo = sanitizeReturnTo(returnTo);
  return `${path}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}
