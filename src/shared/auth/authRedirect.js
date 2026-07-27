import { AUTH_CALLBACK_PATH } from "./authConstants.js";
import { sanitizeReturnTo } from "./returnTo.js";

function getConfiguredCallbackUrl() {
  const value = import.meta.env.VITE_AUTH_CALLBACK_URL?.trim();
  if (!value) return null;

  const url = new URL(value);
  if (url.protocol === "javascript:" || url.protocol === "data:") {
    throw new Error("VITE_AUTH_CALLBACK_URL must use a web or native-app URL scheme");
  }
  return url;
}

export function buildAuthCallbackUrl(returnTo = "/") {
  const safeReturnTo = sanitizeReturnTo(returnTo);
  const configuredUrl = getConfiguredCallbackUrl();

  if (configuredUrl) {
    configuredUrl.searchParams.set("returnTo", safeReturnTo);
    return configuredUrl.toString();
  }

  const basePath = import.meta.env.BASE_URL || "/";
  const webUrl = new URL(basePath, window.location.origin);
  const callbackParams = new URLSearchParams({ returnTo: safeReturnTo });
  webUrl.hash = `${AUTH_CALLBACK_PATH}?${callbackParams}`;
  return webUrl.toString();
}
