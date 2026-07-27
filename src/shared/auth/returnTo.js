import { LOGIN_PATH, SIGNUP_PATH } from "./authConstants.js";

export const DEFAULT_RETURN_TO = "/";

export function sanitizeReturnTo(value, fallback = DEFAULT_RETURN_TO) {
  if (typeof value !== "string" || !value || value !== value.trim()) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;

  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\u0000-\u001f\u007f\\]/.test(decoded)) {
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
