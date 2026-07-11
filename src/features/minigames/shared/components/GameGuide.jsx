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
        <h3 id="game-guide-title">Game guide</h3>
        <p>{guide?.description ?? 'No guide is available yet.'}</p>
        <button type="button" onClick={onClose}>Close</button>
      </GameStageModal>
    </GameStageOverlay>
  );
}
import { GameStageModal, GameStageOverlay } from './GameStageOverlay.jsx';
