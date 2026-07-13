import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../../../shared/components/Brand.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import "../auth.css";

export function LoginPage() {
  const navigate = useNavigate();
  const { isConfigured, signIn, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (status === "authenticated") navigate("/", { replace: true });
  }, [status, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await signIn({ email: email.trim(), password });
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wrap auth-page">
      <div className="card auth-card reveal d1">
        <Brand />
        <h1 className="auth-card__title">로그인</h1>
        <p className="auth-card__subtitle">이메일과 비밀번호로 로그인하세요.</p>

        {isConfigured ? (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="f-label" htmlFor="login-email">이메일</label>
              <input
                className="txt"
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div>
              <label className="f-label" htmlFor="login-password">비밀번호</label>
              <input
                className="txt"
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {errorMessage ? <p className="auth-notice is-error" role="alert">{errorMessage}</p> : null}
            <Button type="submit" variant="primary" fullWidth disabled={submitting}>
              {submitting ? "로그인 중…" : "로그인"}
            </Button>
          </form>
        ) : (
          <p className="auth-notice is-error" role="alert">
            Supabase 환경 변수가 설정되지 않아 로그인을 사용할 수 없습니다.
          </p>
        )}

        <p className="auth-switch">계정이 없으신가요? <Link to="/signup">회원가입</Link></p>
        <p className="auth-switch"><Link to="/">게스트로 계속하기</Link></p>
      </div>
    </div>
  );
}
