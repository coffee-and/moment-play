import "../styles/game-action-feedback.css";

const MAX_STAR_COUNT = 9;

function getDefaultStarCount(variant, hasCombo) {
  if (variant === "major") return 9;
  if (variant === "combo" || hasCombo) return 7;
  return 5;
}

export function GameActionFeedback({ feedback, announce = true }) {
  if (!feedback) return null;

  const combo = Math.max(0, Number(feedback.combo) || 0);
  const comboLabel = feedback.comboLabel ?? (combo >= 2 ? `×${combo}` : "");
  const hasCombo = Boolean(comboLabel);
  const variant = feedback.variant ?? (hasCombo ? "combo" : "standard");
  const tone = feedback.tone ?? "positive";
  const showStars = feedback.showStars ?? tone === "positive";
  const starCount = showStars
    ? Math.min(MAX_STAR_COUNT, Math.max(3, Number(feedback.starCount) || getDefaultStarCount(variant, hasCombo)))
    : 0;
  const hasMessage = Boolean(feedback.label || hasCombo);

  return (
    <div
      aria-atomic={announce ? "true" : undefined}
      aria-hidden={announce ? undefined : "true"}
      className={`game-action-feedback is-${variant} is-${tone}${hasCombo ? " has-combo" : ""}${hasMessage ? " has-message" : " is-sparkle-only"}`}
      data-feedback-variant={variant}
      key={feedback.id}
      role={announce ? "status" : undefined}
      style={{ "--game-action-feedback-duration": `${feedback.durationMs ?? (hasCombo ? 920 : 760)}ms` }}
    >
      {hasMessage ? (
        <span className="game-action-feedback__message">
          {feedback.label ? <strong>{feedback.label}</strong> : null}
          {hasCombo ? <span className="game-action-feedback__combo">{comboLabel}</span> : null}
        </span>
      ) : null}
      {starCount > 0 ? (
        <span className="game-action-feedback__stars" aria-hidden="true">
          {Array.from({ length: starCount }, (_, index) => <i key={index}>✦</i>)}
        </span>
      ) : null}
    </div>
  );
}
