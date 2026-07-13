import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../../../shared/components/Brand.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import "../auth.css";

const MIN_PASSWORD_LENGTH = 6;

export function SignupPage() {
  const navigate = useNavigate();
  const { isConfigured, signUp, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (status === "authenticated") navigate("/", { replace: true });
  }, [status, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("비밀번호가 일치하지 않습니다.");
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
      setErrorMessage(error instanceof Error ? error.message : "회원가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wrap auth-page">
      <div className="card auth-card reveal d1">
        <Brand />
        <h1 className="auth-card__title">회원가입</h1>
        <p className="auth-card__subtitle">이메일과 비밀번호로 계정을 만드세요.</p>

        {isConfigured ? (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
        ) : (
          <p className="auth-notice is-error" role="alert">
            Supabase 환경 변수가 설정되지 않아 회원가입을 사용할 수 없습니다.
          </p>
        )}

        <p className="auth-switch">이미 계정이 있으신가요? <Link to="/login">로그인</Link></p>
        <p className="auth-switch"><Link to="/">게스트로 계속하기</Link></p>
      </div>
    </div>
  );
}
