import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../../../shared/components/Brand.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { completeAuthCallback, parseAuthCallback } from "../../../shared/auth/authCallback.js";
import { AUTH_LABELS, LOGIN_PATH, SIGNUP_PATH } from "../../../shared/auth/authConstants.js";
import { buildAuthRoute } from "../../../shared/auth/returnTo.js";
import { authClassNames as cx } from "../authStyles.js";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isConfigured, refreshSession } = useAuth();
  const completionRef = useRef(null);
  const initialCallback = useRef(parseAuthCallback());
  const [state, setState] = useState(() => ({
    errorMessage: isConfigured ? null : "인증 서비스를 사용할 수 없습니다.",
    status: isConfigured ? "loading" : "error",
  }));

  useEffect(() => {
    if (!isConfigured) return undefined;
    let active = true;

    if (!completionRef.current) {
      completionRef.current = completeAuthCallback()
        .then(async ({ returnTo }) => {
          await refreshSession();
          return { returnTo };
        });
    }

    completionRef.current
      .then(({ returnTo }) => {
        if (!active) return;
        setState({ errorMessage: null, status: "success" });
        navigate(returnTo, { replace: true });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          errorMessage: error instanceof Error ? error.message : "인증을 완료하지 못했습니다.",
          status: "error",
        });
      });

    return () => {
      active = false;
    };
  }, [isConfigured, navigate, refreshSession]);

  const returnTo = initialCallback.current.returnTo;

  return (
    <div className={cx("wrap", "auth-page")}>
      <div className={cx("card", "auth-card", "reveal", "d1")}>
        <Brand />
        <h1 className={cx("auth-card__title")}>계정 인증</h1>
        {state.status === "loading" ? (
          <p className={cx("auth-notice")} role="status">인증 확인 중…</p>
        ) : null}
        {state.status === "success" ? (
          <p className={cx("auth-notice", "is-success")} role="status">인증이 완료되었습니다.</p>
        ) : null}
        {state.status === "error" ? (
          <>
            <p className={cx("auth-notice", "is-error")} role="alert">{state.errorMessage}</p>
            <Button as={Link} to={buildAuthRoute(LOGIN_PATH, returnTo)} variant="primary" fullWidth>
              {AUTH_LABELS.login}
            </Button>
            <p className={cx("auth-switch")}>
              새 인증 메일이 필요하신가요? <Link to={buildAuthRoute(SIGNUP_PATH, returnTo)}>회원가입</Link>
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
