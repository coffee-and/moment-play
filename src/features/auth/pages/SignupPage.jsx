import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Brand } from "../../../shared/components/Brand.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { AUTH_LABELS, AUTH_MESSAGES, LOGIN_PATH, MIN_PASSWORD_LENGTH } from "../../../shared/auth/authConstants.js";
import { buildAuthRoute, getReturnToFromSearch } from "../../../shared/auth/returnTo.js";
import { SocialLoginOptions } from "../components/SocialLoginOptions.jsx";
import { authClassNames as cx } from "../authStyles.js";

export function SignupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isConfigured, signUp, status } = useAuth();
  const returnTo = getReturnToFromSearch(location.search);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (status === "authenticated") navigate(returnTo, { replace: true });
  }, [navigate, returnTo, status]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage(AUTH_MESSAGES.emailAndPasswordRequired);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(AUTH_MESSAGES.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(AUTH_MESSAGES.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      const { session } = await signUp({ email: email.trim(), password, returnTo });
      if (session) {
        navigate(returnTo, { replace: true });
      } else {
        setSuccessMessage("가입 확인 이메일을 보냈어요. 인증 링크를 열면 원래 화면으로 돌아갑니다.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : AUTH_MESSAGES.signUpFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cx("wrap", "auth-page")}>
      <div className={cx("card", "auth-card", "reveal", "d1")}>
        <Brand />
        <h1 className={cx("auth-card__title")}>회원가입</h1>
        <p className={cx("auth-card__subtitle")}>이메일과 비밀번호로 계정을 만드세요.</p>

        {isConfigured ? (
          <>
            <SocialLoginOptions returnTo={returnTo} />
            <form className={cx("auth-form")} onSubmit={handleSubmit} noValidate>
              <div>
                <label className="f-label" htmlFor="signup-email">이메일</label>
                <input
                  className="txt"
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div>
                <label className="f-label" htmlFor="signup-password">비밀번호</label>
                <input
                  className="txt"
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div>
                <label className="f-label" htmlFor="signup-confirm-password">비밀번호 확인</label>
                <input
                  className="txt"
                  id="signup-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              {errorMessage ? <p className={cx("auth-notice", "is-error")} role="alert">{errorMessage}</p> : null}
              {successMessage ? <p className={cx("auth-notice", "is-success")} role="status">{successMessage}</p> : null}
              <Button type="submit" variant="primary" fullWidth disabled={submitting || Boolean(successMessage)}>
                {submitting ? "가입 처리 중…" : "회원가입"}
              </Button>
            </form>
          </>
        ) : (
          <p className={cx("auth-notice", "is-error")} role="alert">{AUTH_MESSAGES.notConfigured}</p>
        )}

        <p className={cx("auth-switch")}>
          이미 계정이 있으신가요? <Link to={buildAuthRoute(LOGIN_PATH, returnTo)}>{AUTH_LABELS.login}</Link>
        </p>
        <p className={cx("auth-switch")}><Link to={returnTo}>게스트로 계속 둘러보기</Link></p>
      </div>
    </div>
  );
}
