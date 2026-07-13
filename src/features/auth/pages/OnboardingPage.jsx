import { Link } from "react-router-dom";
import { Brand } from "../../../shared/components/Brand.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import "../auth.css";

export function OnboardingPage() {
  return (
    <div className="wrap onboarding-page reveal d1">
      <Brand />
      <div>
        <h1>오늘 하루, 잠깐의 게임 한 판</h1>
        <p className="onboarding-page__lede">
          로그인 없이도 모든 미니게임을 바로 즐길 수 있어요. 기록을 저장하고 싶다면 로그인해 주세요.
        </p>
      </div>
      <div className="onboarding-page__actions">
        <Button as={Link} to="/" variant="primary" fullWidth>게스트로 시작하기</Button>
        <Button as={Link} to="/login" variant="secondary" fullWidth>로그인</Button>
      </div>
    </div>
  );
}
