import { useState } from "react";
import { BookOpenTextIcon } from "../../../../shared/components/icons/PhosphorIcons.jsx";
import { GameStageModal, GameStageOverlay } from './GameStageOverlay.jsx';
import { GameGuideExample } from "./GameGuideExample.jsx";
import "../styles/game-guide.css";

export function GameGuideIconButton({ label, onClick }) {
  return (
    <button type="button" className="game-guide-icon" onClick={onClick} aria-label={label}>
      <BookOpenTextIcon />
    </button>
  );
}

export function GameGuideContent({ compact = false, guide }) {
  const [stepIndex, setStepIndex] = useState(0);
  const description = guide?.description ?? "등록된 게임 설명이 없어요.";
  const steps = guide?.steps ?? [];
  const hasWalkthrough = Boolean(guide?.walkthrough && steps.length);

  if (hasWalkthrough) {
    return (
      <div className={`game-guide-content game-guide-content--walkthrough${compact ? " game-guide-content--compact" : ""}`}>
        <p>{description}</p>
        <section className="game-guide-walkthrough" aria-label="게임 방법 단계">
          <div className="game-guide-walkthrough__header">
            <strong>{stepIndex + 1} / {steps.length}</strong>
            <div className="game-guide-walkthrough__steps" role="group" aria-label="설명 단계 선택">
              {steps.map((step, index) => (
                <button
                  aria-current={index === stepIndex ? "step" : undefined}
                  aria-label={`${index + 1}단계 보기`}
                  key={step}
                  onClick={() => setStepIndex(index)}
                  type="button"
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
          <p aria-live="polite">{steps[stepIndex]}</p>
          <GameGuideExample type={guide?.examples?.[stepIndex] ?? guide?.example} />
          <div className="game-guide-walkthrough__actions">
            <button disabled={stepIndex === 0} onClick={() => setStepIndex((current) => current - 1)} type="button">이전</button>
            <button disabled={stepIndex === steps.length - 1} onClick={() => setStepIndex((current) => current + 1)} type="button">다음</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`game-guide-content${compact ? " game-guide-content--compact" : ""}`}>
      <p>{description}</p>
      {!compact && guide?.steps?.length ? (
        <ol>
          {guide.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      ) : null}
      <GameGuideExample type={guide?.example} />
    </div>
  );
}

export function GameGuideModal({ guide, onClose }) {
  return (
    <GameStageOverlay state="guide" closeOnBackdrop closeOnEscape onClose={onClose}>
      <GameStageModal className="game-guide-modal" role="dialog" aria-modal="true" aria-labelledby="game-guide-title">
        <h3 id="game-guide-title">게임 방법</h3>
        <GameGuideContent guide={guide} />
        <button className="button button--primary" type="button" onClick={onClose}>확인</button>
      </GameStageModal>
    </GameStageOverlay>
  );
}
