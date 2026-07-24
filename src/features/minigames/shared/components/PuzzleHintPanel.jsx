import { Button } from "../../../../shared/components/Button.jsx";
import "../styles/logic-puzzle-stage.css";

export function PuzzleHintButton({ hint }) {
  if (!hint || hint.stepCount === 0) return null;
  return (
    <Button size="small" type="button" variant="secondary" onClick={hint.requestHint}>
      {hint.hasUsedHint ? "힌트 계속보기" : "힌트 보기"}
    </Button>
  );
}

export function PuzzleHintPanel({ gameId, hint }) {
  if (!hint?.isOpen) return null;

  if (!hint.hasUsedHint) {
    return (
      <section className="puzzle-hint-panel" aria-labelledby={`${gameId}-hint-consent-title`}>
        <div className="puzzle-hint-panel__copy">
          <strong id={`${gameId}-hint-consent-title`}>힌트를 사용할까요?</strong>
          <p>힌트를 사용한 이번 판은 연습 기록으로 남고 공식 랭킹에는 제출되지 않아요.</p>
        </div>
        <div className="puzzle-hint-panel__actions">
          <Button size="small" type="button" onClick={hint.acceptHint}>힌트 사용하기</Button>
          <Button size="small" type="button" variant="secondary" onClick={hint.closeHint}>닫기</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="puzzle-hint-panel" aria-labelledby={`${gameId}-hint-title`}>
      <div className="puzzle-hint-panel__copy">
        <strong id={`${gameId}-hint-title`}>힌트 {hint.stepIndex + 1} / {hint.stepCount}</strong>
        <p aria-live="polite">{hint.currentStep?.message}</p>
      </div>
      <div className="puzzle-hint-panel__actions">
        {hint.stepIndex > 0 ? (
          <Button size="small" type="button" variant="secondary" onClick={hint.showPreviousHint}>
            이전
          </Button>
        ) : null}
        {hint.stepIndex < hint.stepCount - 1 ? (
          <Button size="small" type="button" onClick={hint.showNextHint}>다음 힌트</Button>
        ) : null}
        <Button size="small" type="button" variant="secondary" onClick={hint.closeHint}>
          보드에서 보기
        </Button>
      </div>
    </section>
  );
}
