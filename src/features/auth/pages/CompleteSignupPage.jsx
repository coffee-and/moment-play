import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../../../shared/components/Brand.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { AUTH_MESSAGES, MIN_PASSWORD_LENGTH } from "../../../shared/auth/authConstants.js";
import "../auth.css";

// The confirmation link's `?code=` param normally lands before the
// HashRouter fragment (`?code=...#/complete-signup`), but is read from both
// possible positions defensively in case Supabase ever appends it after the
// hash instead (`#/complete-signup?code=...`).
function extractCodeFromLocation() {
  const searchCode = new URLSearchParams(window.location.search).get("code");
  if (searchCode) return searchCode;

  const hash = window.location.hash || "";
  const hashQueryIndex = hash.indexOf("?");
  if (hashQueryIndex === -1) return null;

  return new URLSearchParams(hash.slice(hashQueryIndex + 1)).get("code");
}

// Step 2 of the anonymous -> permanent upgrade (see AuthContext.jsx). Reached
// either straight after Step 1 (email just linked, not verified yet) or via
// the emailed confirmation link (carries a `?code=` to exchange for a
// session). Either way, the password form only renders once `status` itself
// confirms the email is verified - never assumed from just being on this page.
export function CompleteSignupPage() {
  const navigate = useNavigate();
  const { completeAccountUpgrade, completeEmailVerification, isConfigured, refreshSession, status } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!isConfigured) {
      setVerifying(false);
      return undefined;
    }

    const code = extractCodeFromLocation();
    if (!code) {
      setVerifying(false);
      return undefined;
    }

    let cancelled = false;
    completeEmailVerification(code)
      .catch((error) => {
        if (!cancelled) setVerifyError(error instanceof Error ? error.message : AUTH_MESSAGES.verifyCodeFailed);
      })
      .finally(() => {
        if (!cancelled) setVerifying(false);
      });

    return () => {
      cancelled = true;
    };
    // Exchanges whatever code was in the URL at mount time exactly once -
    // re-running this on every render would try to reuse an already-spent
    // code and fail.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    if (!password) {
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
      await completeAccountUpgrade({ password });
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : AUTH_MESSAGES.completeUpgradeFailed);
    } finally {
      setSubmitting(false);
    }
  }

  let body;
  if (!isConfigured) {
    body = <p className="auth-notice is-error" role="alert">{AUTH_MESSAGES.notConfigured}</p>;
  } else if (verifying) {
    body = <p className="auth-notice" role="status">인증 확인 중…</p>;
  } else if (verifyError) {
    body = (
      <>
        <p className="auth-notice is-error" role="alert">{verifyError}</p>
        <p className="auth-switch"><Link to="/login">로그인으로 이동</Link></p>
      </>
    );
  } else if (status !== "authenticated") {
    body = (
      <>
        <p className="auth-notice" role="status">
          이메일로 보낸 인증 링크를 확인해 주세요. 인증을 마쳤다면 아래 버튼을 눌러 주세요.
        </p>
        <Button type="button" variant="secondary" fullWidth onClick={() => refreshSession()}>
          인증 확인 다시 하기
        </Button>
      </>
    );
  } else {
    body = (
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="f-label" htmlFor="complete-signup-password">비밀번호</label>
          <input
            className="txt"
            id="complete-signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div>
          <label className="f-label" htmlFor="complete-signup-confirm-password">비밀번호 확인</label>
          <input
            className="txt"
            id="complete-signup-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        {errorMessage ? <p className="auth-notice is-error" role="alert">{errorMessage}</p> : null}
        <Button type="submit" variant="primary" fullWidth disabled={submitting}>
          {submitting ? "저장 중…" : "비밀번호 설정하고 완료하기"}
        </Button>
      </form>
    );
  }

  return (
    <div className="wrap auth-page">
      <div className="card auth-card reveal d1">
        <Brand />
        <h1 className="auth-card__title">계정 만들기 완료</h1>
        <p className="auth-card__subtitle">이메일 인증 후 비밀번호를 설정하면 가입이 끝나요.</p>
        {body}
      </div>
    </div>
  );
}
