export const AUTH_PROVIDER_IDS = Object.freeze({
  GOOGLE: "google",
  KAKAO: "kakao",
  NAVER: "naver",
});

const PROVIDER_ORDER = [
  AUTH_PROVIDER_IDS.GOOGLE,
  AUTH_PROVIDER_IDS.KAKAO,
  AUTH_PROVIDER_IDS.NAVER,
];

const PROVIDER_DEFINITIONS = Object.freeze({
  [AUTH_PROVIDER_IDS.GOOGLE]: Object.freeze({
    id: AUTH_PROVIDER_IDS.GOOGLE,
    label: "Google로 계속하기",
    supabaseProvider: "google",
  }),
  [AUTH_PROVIDER_IDS.KAKAO]: Object.freeze({
    id: AUTH_PROVIDER_IDS.KAKAO,
    label: "카카오 로그인",
    supabaseProvider: "kakao",
  }),
  [AUTH_PROVIDER_IDS.NAVER]: Object.freeze({
    id: AUTH_PROVIDER_IDS.NAVER,
    label: "네이버로 계속하기",
    supabaseProvider: "custom:naver",
  }),
});

function isEnabledFlag(value) {
  return typeof value === "string" && value.trim().toLowerCase() === "true";
}

function getProviderFlags() {
  return {
    [AUTH_PROVIDER_IDS.GOOGLE]: import.meta.env.VITE_AUTH_GOOGLE_ENABLED,
    [AUTH_PROVIDER_IDS.KAKAO]: import.meta.env.VITE_AUTH_KAKAO_ENABLED,
    [AUTH_PROVIDER_IDS.NAVER]: import.meta.env.VITE_AUTH_NAVER_ENABLED,
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
