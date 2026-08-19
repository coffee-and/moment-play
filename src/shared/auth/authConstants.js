export const AUTH_CALLBACK_PATH = "/auth/callback";
export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/signup";
export const MIN_PASSWORD_LENGTH = 6;

export const AUTH_LABELS = {
  accountFallback: "내 계정",
  createAccount: "계정 만들기",
  loading: "계정 확인 중",
  login: "로그인",
  logout: "로그아웃",
  loggingOut: "로그아웃 중…",
};

export function getAccountLabel(user) {
  const emailPrefix = user?.email?.split("@")[0]?.trim();
  return emailPrefix || AUTH_LABELS.accountFallback;
}

export const AUTH_MESSAGES = {
  notConfigured: "Supabase 환경 변수가 설정되지 않아 이 기능을 사용할 수 없습니다.",
  emailAndPasswordRequired: "이메일과 비밀번호를 입력해 주세요.",
  passwordTooShort: `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
  passwordMismatch: "비밀번호가 일치하지 않습니다.",
  emailAlreadyRegistered: "이미 가입된 이메일이에요. 로그인해 주세요.",
  signUpFailed: "회원가입에 실패했습니다.",
  signInFailed: "이메일 또는 비밀번호가 올바르지 않습니다.",
  signOutFailed: "로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  sessionRestoreFailed: "로그인 상태를 복원하지 못했습니다.",
  authenticationRequired: "로그인해야 게임을 시작할 수 있습니다.",
  verifyCodeFailed: "인증 링크가 만료되었거나 올바르지 않습니다.",
  missingCallbackCode: "인증 코드가 없습니다. 이메일의 인증 링크를 다시 열어 주세요.",
  malformedCallback: "인증 응답을 확인할 수 없습니다. 다시 로그인해 주세요.",
  callbackCodeAlreadyUsed: "이미 처리된 인증 링크입니다. 다시 로그인해 주세요.",
  providerNotConfigured: "이 소셜 로그인은 아직 사용할 수 없습니다.",
  providerSignInFailed: "소셜 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  providerCancelled: "소셜 로그인이 취소되었습니다. 다시 시도할 수 있습니다.",
  unsupportedProvider: "지원하지 않는 로그인 방식입니다.",
};
