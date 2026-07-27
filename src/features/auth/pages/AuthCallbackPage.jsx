import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../../../shared/components/Brand.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { completeAuthCallback, parseAuthCallback } from "../../../shared/auth/authCallback.js";
import { AUTH_LABELS, LOGIN_PATH, SIGNUP_PATH } from "../../../shared/auth/authConstants.js";
import { buildAuthRoute } from "../../../shared/auth/returnTo.js";
import "../auth.css";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isConfigured, refreshSession } = useAuth();
  const startedRef = useRef(false);
  const initialCallback = useRef(parseAuthCallback());
  const [state, setState] = useState(() => ({
    errorMessage: isConfigured ? null : "인증 서비스를 사용할 수 없습니다.",
    status: isConfigured ? "loading" : "error",
  }));

  useEffect(() => {
    if (!isConfigured || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    completeAuthCallback()
      .then(async ({ returnTo }) => {
        await refreshSession();
        if (cancelled) return;
        setState({ errorMessage: null, status: "success" });
        navigate(returnTo, { replace: true });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          errorMessage: error instanceof Error ? error.message : "인증을 완료하지 못했습니다.",
          status: "error",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isConfigured, navigate, refreshSession]);

  const returnTo = initialCallback.current.returnTo;

  return (
    <div className="wrap auth-page">
      <div className="card auth-card reveal d1">
        <Brand />
        <h1 className="auth-card__title">계정 인증</h1>
        {state.status === "loading" ? (
          <p className="auth-notice" role="status">인증 확인 중…</p>
        ) : null}
        {state.status === "success" ? (
          <p className="auth-notice is-success" role="status">인증이 완료되었습니다.</p>
        ) : null}
        {state.status === "error" ? (
          <>
            <p className="auth-notice is-error" role="alert">{state.errorMessage}</p>
            <Button as={Link} to={buildAuthRoute(LOGIN_PATH, returnTo)} variant="primary" fullWidth>
              {AUTH_LABELS.login}
            </Button>
            <p className="auth-switch">
              새 인증 메일이 필요하신가요? <Link to={buildAuthRoute(SIGNUP_PATH, returnTo)}>회원가입</Link>
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
