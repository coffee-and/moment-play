import { STATUS_BADGE_LABEL, STATUS_CTA_LABEL } from "../data/minigameCatalog.js";
import { getMinigameComponent } from "../data/minigameRegistry.js";
import { MiniGamePreview } from "./MiniGamePreview.jsx";

function joinClassNames(values) {
  return values.filter(Boolean).join(" ");
}

export function MiniGameCard({ game, isActive, onSelect }) {
  const canOpen = Boolean(getMinigameComponent(game.id));
  const statusLabel = STATUS_CTA_LABEL[game.status] ?? game.status;

  return (
    <button
      type="button"
      className={joinClassNames(["minigame-card", "gcard", isActive ? "is-active" : "", canOpen ? "open" : "soon"])}
      disabled={!canOpen}
      onClick={() => onSelect(game.id)}
      aria-pressed={canOpen ? isActive : undefined}
    >
      <span className="gc-top">
        <span className={joinClassNames(["badge", game.category === "Online" ? "online" : ""])}>{game.category}</span>
      </span>
      <span className="gc-preview" aria-hidden="true">
        <MiniGamePreview gameId={game.id} />
      </span>
      <span className="minigame-card__body">
        <span className="gc-en">{game.route.replace("/minigames/", "")}</span>
        <strong className="gc-name">{game.title}</strong>
        <span className="gc-desc">{game.description}</span>
      </span>
      <span className="gc-bot">
        <span className="badge">{STATUS_BADGE_LABEL[game.status] ?? game.status}</span>
        {canOpen ? <span className="gc-play">{statusLabel}<span className="arw" aria-hidden="true" /></span> : null}
      </span>
    </button>
  );
}
