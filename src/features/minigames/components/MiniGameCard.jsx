import { MINIGAME_STATUS } from "../data/minigameCatalog.js";

const STATUS_LABEL = {
  [MINIGAME_STATUS.AVAILABLE]: "Play",
  [MINIGAME_STATUS.COMING_SOON]: "Soon",
  [MINIGAME_STATUS.IN_PROGRESS]: "UI ready",
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
      className={joinClassNames(["minigame-card", "gcard", isActive ? "is-active" : "", canOpen ? "open" : "soon"])}
      disabled={!canOpen}
      onClick={() => onSelect(game.id)}
      aria-pressed={canOpen ? isActive : undefined}
    >
      <span className="gc-top">
        <span className="gc-num">{game.icon}</span>
        <span className={joinClassNames(["badge", game.category === "Online" ? "online" : ""])}>{game.category}</span>
      </span>
      <span className="minigame-card__body">
        <span className="gc-en">{game.path.replace("/minigames/", "")}</span>
        <strong className="gc-name">{game.title}</strong>
        <span className="gc-desc">{game.description}</span>
      </span>
      <span className="gc-bot">
        <span className="badge">{game.status === MINIGAME_STATUS.IN_PROGRESS ? "Next logic" : game.status === MINIGAME_STATUS.AVAILABLE ? "Solo" : "Soon"}</span>
        <span className="gc-play">{statusLabel}<span className="arw" aria-hidden="true" /></span>
      </span>
    </button>
  );
}
