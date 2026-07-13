import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../../../shared/components/Brand.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { AUTH_MESSAGES, COMPLETE_SIGNUP_PATH, MIN_PASSWORD_LENGTH } from "../../../shared/auth/authConstants.js";
import "../auth.css";

// Guests (no session at all) get the standard one-step email+password
// signup. A player who has been playing anonymously (e.g. via the Omok
// online-room flow) instead only attaches an email here - Supabase requires
// manual linking for that, and setting a password in the same request would
// mean setting one on a still-unverified identity, which is unsafe. The
// password is chosen afterwards, once verified, on CompleteSignupPage.
export function SignupPage() {
  const navigate = useNavigate();
  const { isConfigured, linkEmail, signUp, status } = useAuth();
  const isAnonymousUpgrade = status === "anonymous";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (status === "authenticated") navigate("/", { replace: true });
  }, [status, navigate]);

  async function handleAnonymousUpgradeSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage(AUTH_MESSAGES.emailRequired);
      return;
    }

    setSubmitting(true);
    try {
      await linkEmail({ email: email.trim() });
      navigate(COMPLETE_SIGNUP_PATH);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : AUTH_MESSAGES.linkEmailFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNewAccountSubmit(event) {
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
      const { session } = await signUp({ email: email.trim(), password });
      if (session) {
        navigate("/", { replace: true });
      } else {
        setSuccessMessage("가입 확인 이메일을 보냈어요. 메일함을 확인한 뒤 다시 로그인해 주세요.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : AUTH_MESSAGES.signUpFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wrap auth-page">
      <div className="card auth-card reveal d1">
        <Brand />
        <h1 className="auth-card__title">회원가입</h1>
        <p className="auth-card__subtitle">
          {isAnonymousUpgrade
            ? "이메일을 연결하면 지금까지의 플레이 기록을 그대로 이어갈 수 있어요."
            : "이메일과 비밀번호로 계정을 만드세요."}
        </p>

        {isConfigured ? (
          isAnonymousUpgrade ? (
            <form className="auth-form" onSubmit={handleAnonymousUpgradeSubmit} noValidate>
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
              {errorMessage ? <p className="auth-notice is-error" role="alert">{errorMessage}</p> : null}
              <Button type="submit" variant="primary" fullWidth disabled={submitting}>
                {submitting ? "이메일 연결 중…" : "이메일 연결하기"}
              </Button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleNewAccountSubmit} noValidate>
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
              {errorMessage ? <p className="auth-notice is-error" role="alert">{errorMessage}</p> : null}
              {successMessage ? <p className="auth-notice is-success" role="status">{successMessage}</p> : null}
              <Button type="submit" variant="primary" fullWidth disabled={submitting}>
                {submitting ? "가입 처리 중…" : "회원가입"}
              </Button>
            </form>
          )
        ) : (
          <p className="auth-notice is-error" role="alert">{AUTH_MESSAGES.notConfigured}</p>
        )}

        <p className="auth-switch">이미 계정이 있으신가요? <Link to="/login">로그인</Link></p>
        <p className="auth-switch"><Link to="/">게스트로 계속하기</Link></p>
      </div>
    </div>
  );
}
