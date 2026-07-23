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

export function GameGuideContent({ guide }) {
  const description = guide?.description ?? "등록된 게임 설명이 없어요.";
  return (
    <div className="game-guide-content">
      <p>{description}</p>
      {guide?.steps?.length ? (
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
