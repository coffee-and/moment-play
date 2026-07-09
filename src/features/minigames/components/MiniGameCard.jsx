import { MINIGAME_STATUS } from "../data/minigameCatalog.js";

const STATUS_LABEL = {
  [MINIGAME_STATUS.AVAILABLE]: "Available",
  [MINIGAME_STATUS.COMING_SOON]: "Coming soon",
  [MINIGAME_STATUS.IN_PROGRESS]: "In progress",
};

function joinClassNames(values) {
  return values.filter(Boolean).join(" ");
}

export function MiniGameCard({ game, isActive, onSelect }) {
  const canOpen = Boolean(game.component);
  const statusLabel = STATUS_LABEL[game.status] ?? game.status;

  return (
    <button
      type="button"
      className={joinClassNames(["minigame-card", isActive ? "is-active" : "", canOpen ? "" : "is-disabled"])}
      disabled={!canOpen}
      onClick={() => onSelect(game.id)}
      aria-pressed={canOpen ? isActive : undefined}
    >
      <span className="minigame-card__icon" aria-hidden="true">{game.icon}</span>
      <span className="minigame-card__body">
        <span className="minigame-card__meta">{game.category}</span>
        <strong>{game.title}</strong>
        <span>{game.description}</span>
      </span>
      <span className="minigame-card__status">{statusLabel}</span>
    </button>
  );
}
