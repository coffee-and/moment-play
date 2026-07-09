export function GameGuideIconButton({ label, onClick }) {
  return (
    <button type="button" className="game-guide-icon" onClick={onClick} aria-label={label}>
      ?
    </button>
  );
}

export function GameGuideModal({ guide, onClose }) {
  return (
    <div className="game-guide-modal" role="dialog" aria-modal="true">
      <h3>Game guide</h3>
      <p>{guide?.description ?? 'No guide is available yet.'}</p>
      <button type="button" onClick={onClose}>Close</button>
    </div>
  );
}
