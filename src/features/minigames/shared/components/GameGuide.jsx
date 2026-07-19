export function GameGuideIconButton({ label, onClick }) {
  return (
    <button type="button" className="game-guide-icon" onClick={onClick} aria-label={label}>
      ?
    </button>
  );
}

export function GameGuideModal({ guide, onClose }) {
  return (
    <GameStageOverlay state="guide" closeOnBackdrop closeOnEscape onClose={onClose}>
      <GameStageModal className="game-guide-modal" role="dialog" aria-modal="true" aria-labelledby="game-guide-title">
        <h3 id="game-guide-title">게임 방법</h3>
        <p>{guide?.description ?? '등록된 게임 설명이 없어요.'}</p>
        <button className="button button--primary" type="button" onClick={onClose}>확인</button>
      </GameStageModal>
    </GameStageOverlay>
  );
}
import { GameStageModal, GameStageOverlay } from './GameStageOverlay.jsx';
