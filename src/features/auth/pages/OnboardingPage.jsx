import { Link } from "react-router-dom";
import { Brand } from "../../../shared/components/Brand.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { AUTH_LABELS, LOGIN_PATH } from "../../../shared/auth/authConstants.js";
import "../auth.css";

export function OnboardingPage() {
  return (
    <div className="wrap onboarding-page reveal d1">
      <Brand />
      <div>
        <h1 className="page-title">오늘 하루, 잠깐의 게임 한 판</h1>
        <p className="onboarding-page__lede">
          게임과 설명은 로그인 없이 둘러볼 수 있어요. 게임을 시작하려면 로그인해 주세요.
        </p>
      </div>
      <div className="onboarding-page__actions">
        <Button as={Link} to="/" variant="primary" fullWidth>게스트로 둘러보기</Button>
        <Button as={Link} to={LOGIN_PATH} variant="secondary" fullWidth>{AUTH_LABELS.login}</Button>
      </div>
    </div>
  );
}
