import { hasMinigameComponent } from "../data/minigameRegistry.js";
import { MiniGamePreview } from "./MiniGamePreview.jsx";
import { catalogClassName as cx } from "../pages/catalogStyles.js";

export function MiniGameCard({ game, onSelect, showCategory = false, variant = "catalog" }) {
  const canOpen = hasMinigameComponent(game.id);

  return (
    <button
      type="button"
      className={cx("minigame-card", "gcard", `gcard--${variant}`, canOpen ? "open" : "soon")}
      data-game={game.id}
      disabled={!canOpen}
      onClick={() => onSelect(game.id)}
    >
      {showCategory ? <span className={cx("gc-category")}>{game.category}</span> : null}
      <span className={cx("gc-preview")} aria-hidden="true">
        <MiniGamePreview gameId={game.id} />
      </span>
      <span className={cx("minigame-card__body")}>
        <strong className={cx("gc-name")}>{game.title}</strong>
        <span className={cx("gc-desc")}>{variant === "home" ? (game.homeCardDescription ?? game.cardDescription ?? game.description) : (game.cardDescription ?? game.description)}</span>
      </span>
      <span className={cx("gc-bot")}>
        {canOpen ? <span className={cx("gc-play")}>PLAY <span className={cx("arw")} aria-hidden="true" /></span> : <span className={cx("gc-soon")}>준비 중</span>}
      </span>
    </button>
  );
}
