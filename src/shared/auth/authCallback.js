import { exchangeAuthCode } from "../../infrastructure/supabase/authGateway.js";
import { AUTH_MESSAGES } from "./authConstants.js";
import { sanitizeReturnTo } from "./returnTo.js";

const consumedCodes = new Set();
const CALLBACK_PARAM_NAMES = ["code", "error", "error_code", "error_description"];

function getHashParams(hash) {
  const queryIndex = hash.indexOf("?");
  return queryIndex === -1 ? new URLSearchParams() : new URLSearchParams(hash.slice(queryIndex + 1));
}

function getCallbackParts(locationLike) {
  if (typeof locationLike === "string") {
    const url = new URL(locationLike);
    return { hash: url.hash, search: url.search };
  }
  return {
    hash: locationLike?.hash ?? "",
    search: locationLike?.search ?? "",
  };
}

function readParam(searchParams, hashParams, name) {
  return searchParams.get(name) ?? hashParams.get(name);
}

export function parseAuthCallback(locationLike = window.location) {
  try {
    const { hash, search } = getCallbackParts(locationLike);
    const searchParams = new URLSearchParams(search);
    const hashParams = getHashParams(hash);
    const returnTo = sanitizeReturnTo(readParam(searchParams, hashParams, "returnTo"));
    const providerError = readParam(searchParams, hashParams, "error")
      || readParam(searchParams, hashParams, "error_code");

    if (providerError) {
      return {
        code: null,
        errorMessage: readParam(searchParams, hashParams, "error_description") || AUTH_MESSAGES.verifyCodeFailed,
        returnTo,
      };
    }

    const code = readParam(searchParams, hashParams, "code");
    if (!code || !code.trim()) {
      return { code: null, errorMessage: AUTH_MESSAGES.missingCallbackCode, returnTo };
    }

    return { code, errorMessage: null, returnTo };
  } catch {
    return { code: null, errorMessage: AUTH_MESSAGES.malformedCallback, returnTo: "/" };
  }
}

export function scrubAuthCallbackFromBrowserUrl() {
  const url = new URL(window.location.href);
  CALLBACK_PARAM_NAMES.forEach((name) => url.searchParams.delete(name));

  const hashQueryIndex = url.hash.indexOf("?");
  if (hashQueryIndex !== -1) {
    const hashPath = url.hash.slice(0, hashQueryIndex);
    const hashParams = new URLSearchParams(url.hash.slice(hashQueryIndex + 1));
    CALLBACK_PARAM_NAMES.forEach((name) => hashParams.delete(name));
    const remaining = hashParams.toString();
    url.hash = remaining ? `${hashPath}?${remaining}` : hashPath;
  }

  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export async function completeAuthCallback(locationLike = window.location) {
  const parsed = parseAuthCallback(locationLike);
  if (locationLike === window.location) scrubAuthCallbackFromBrowserUrl();
  if (parsed.errorMessage) throw new Error(parsed.errorMessage);
  if (consumedCodes.has(parsed.code)) throw new Error(AUTH_MESSAGES.callbackCodeAlreadyUsed);

  consumedCodes.add(parsed.code);
  const session = await exchangeAuthCode(parsed.code);
  return { returnTo: parsed.returnTo, session };
}

export function resetConsumedAuthCodesForTests() {
  if (import.meta.env.MODE === "test") consumedCodes.clear();
}
