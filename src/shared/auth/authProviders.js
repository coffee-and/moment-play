export const AUTH_PROVIDER_IDS = Object.freeze({
  GOOGLE: "google",
});

const PROVIDER_ORDER = [
  AUTH_PROVIDER_IDS.GOOGLE,
];

const PROVIDER_DEFINITIONS = Object.freeze({
  [AUTH_PROVIDER_IDS.GOOGLE]: Object.freeze({
    id: AUTH_PROVIDER_IDS.GOOGLE,
    label: "Google로 계속하기",
    supabaseProvider: "google",
  }),
});

function isEnabledFlag(value) {
  return typeof value === "string" && value.trim().toLowerCase() === "true";
}

function getProviderFlags() {
  return {
    [AUTH_PROVIDER_IDS.GOOGLE]: import.meta.env.VITE_AUTH_GOOGLE_ENABLED,
  };
}

export function getAuthProvider(provider) {
  return PROVIDER_DEFINITIONS[provider] ?? null;
}

export function isAuthProviderEnabled(provider) {
  if (!getAuthProvider(provider)) return false;
  return isEnabledFlag(getProviderFlags()[provider]);
}

export function getEnabledAuthProviders() {
  return PROVIDER_ORDER.filter(isAuthProviderEnabled);
}
