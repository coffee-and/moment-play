import { useState } from "react";
import { BookOpenTextIcon } from "../../../shared/components/icons/PhosphorIcons.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { IconButton } from "../../../shared/components/IconButton.jsx";
import { bindCssModule } from "../../../shared/styles/bindCssModule.js";
import { GameStageModal, GameStageOverlay } from "../shared/components/GameStageOverlay.jsx";
import { GameGuideExample } from "./GameGuideExample.jsx";
import styles from "./game-guide.module.css";

const cx = bindCssModule(styles);

export function GameGuideIconButton({ label, onClick }) {
  return (
    <IconButton label={label} onClick={onClick} variant="stage">
      <BookOpenTextIcon />
    </IconButton>
  );
}

export function GameGuideContent({ compact = false, guide }) {
  const [stepIndex, setStepIndex] = useState(0);
  const description = guide?.description ?? "등록된 게임 설명이 없어요.";
  const steps = guide?.steps ?? [];
  const hasWalkthrough = Boolean(guide?.walkthrough && steps.length);

  if (hasWalkthrough) {
    return (
      <div className={cx("game-guide-content", "game-guide-content--walkthrough", compact && "game-guide-content--compact")}>
        <p>{description}</p>
        <section className={cx("game-guide-walkthrough")} aria-label="게임 방법 단계">
          <div className={cx("game-guide-walkthrough__header")}>
            <strong aria-live="polite">{stepIndex + 1} / {steps.length}</strong>
          </div>
          <p aria-live="polite">{steps[stepIndex]}</p>
          <GameGuideExample type={guide?.examples?.[stepIndex] ?? guide?.example} />
          <div className={cx("game-guide-walkthrough__actions")}>
            <button disabled={stepIndex === 0} onClick={() => setStepIndex((current) => current - 1)} type="button">이전</button>
            <button disabled={stepIndex === steps.length - 1} onClick={() => setStepIndex((current) => current + 1)} type="button">다음</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={cx("game-guide-content", compact && "game-guide-content--compact")}>
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
      <GameStageModal className={cx("game-guide-modal")} role="dialog" aria-modal="true" aria-labelledby="game-guide-title">
        <h3 id="game-guide-title">게임 방법</h3>
        <GameGuideContent guide={guide} />
        <Button onClick={onClose}>확인</Button>
      </GameStageModal>
    </GameStageOverlay>
  );
}
