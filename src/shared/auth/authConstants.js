// Shared across AuthContext and every auth page - single source of truth for
// the account-completion route and user-facing auth copy, so validation
// messages and the route name aren't duplicated across files.
export const COMPLETE_SIGNUP_PATH = "/complete-signup";
export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/signup";
export const MIN_PASSWORD_LENGTH = 6;

export const AUTH_LABELS = {
  accountFallback: "내 계정",
  anonymous: "게스트",
  createAccount: "계정 만들기",
  loading: "계정 확인 중",
  login: "로그인",
  logout: "로그아웃",
};

// Shared by the desktop header and mobile tab-bar account controls so both
// surfaces derive the exact same label from the same AuthContext user.
export function getAccountLabel(user) {
  const nickname = user?.user_metadata?.nickname?.trim();
  if (nickname) return nickname;
  const emailPrefix = user?.email?.split("@")[0]?.trim();
  return emailPrefix || AUTH_LABELS.accountFallback;
}

export const AUTH_MESSAGES = {
  notConfigured: "Supabase 환경 변수가 설정되지 않아 이 기능을 사용할 수 없습니다.",
  emailRequired: "이메일을 입력해 주세요.",
  emailAndPasswordRequired: "이메일과 비밀번호를 입력해 주세요.",
  passwordTooShort: `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
  passwordMismatch: "비밀번호가 일치하지 않습니다.",
  emailAlreadyRegistered: "이미 가입된 이메일이에요. 로그인해 주세요.",
  signUpFailed: "회원가입에 실패했습니다.",
  signInFailed: "이메일 또는 비밀번호가 올바르지 않습니다.",
  signOutFailed: "로그아웃에 실패했습니다.",
  linkEmailFailed: "이메일을 연결하지 못했습니다.",
  linkEmailRequiresAnonymous: "이메일 연결은 게스트로 플레이 중인 계정에서만 사용할 수 있습니다.",
  useLinkEmailInstead: "게스트로 플레이하던 계정은 이메일 연결부터 시작해 주세요.",
  completeUpgradeFailed: "비밀번호를 설정하지 못했습니다.",
  notYetVerified: "이메일 인증이 아직 완료되지 않았습니다.",
  verifyCodeFailed: "인증 링크가 만료되었거나 올바르지 않습니다.",
};
