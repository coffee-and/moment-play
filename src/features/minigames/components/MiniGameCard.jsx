import { getMinigameComponent } from "../data/minigameRegistry.js";
import { MiniGamePreview } from "./MiniGamePreview.jsx";

function joinClassNames(values) {
  return values.filter(Boolean).join(" ");
}

export function MiniGameCard({ game, onSelect }) {
  const canOpen = Boolean(getMinigameComponent(game.id));

  return (
    <button
      type="button"
      className={joinClassNames(["minigame-card", "gcard", canOpen ? "open" : "soon"])}
      data-game={game.id}
      disabled={!canOpen}
      onClick={() => onSelect(game.id)}
    >
      <span className="gc-preview" aria-hidden="true">
        <MiniGamePreview gameId={game.id} />
      </span>
      <span className="minigame-card__body">
        <strong className="gc-name">{game.title}</strong>
        <span className="gc-desc">{game.description}</span>
      </span>
      <span className="gc-bot">
        {canOpen ? <span className="gc-play">Play <span className="arw" aria-hidden="true" /></span> : <span className="gc-soon">준비 중</span>}
      </span>
    </button>
  );
}
