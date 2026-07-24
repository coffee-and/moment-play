import "../styles/game-action-feedback.css";

const STAR_COUNT = 5;

export function GameActionFeedback({ feedback, announce = true }) {
  if (!feedback) return null;

  const combo = Math.max(0, Number(feedback.combo) || 0);
  const comboLabel = feedback.comboLabel ?? (combo >= 2 ? `${combo} COMBO` : "");
  const hasCombo = Boolean(comboLabel);
  const showStars = feedback.showStars ?? hasCombo;
  const variant = feedback.variant ?? (hasCombo ? "combo" : "standard");
  const tone = feedback.tone ?? "positive";

  return (
    <div
      aria-atomic={announce ? "true" : undefined}
      aria-hidden={announce ? undefined : "true"}
      className={`game-action-feedback is-${variant} is-${tone}${hasCombo ? " has-combo" : ""}`}
      key={feedback.id}
      role={announce ? "status" : undefined}
      style={{ "--game-action-feedback-duration": `${feedback.durationMs ?? (hasCombo ? 1050 : 820)}ms` }}
    >
      {feedback.label ? <strong>{feedback.label}</strong> : null}
      {hasCombo ? <span className="game-action-feedback__combo">{comboLabel}</span> : null}
      {showStars ? (
        <span className="game-action-feedback__stars" aria-hidden="true">
          {Array.from({ length: STAR_COUNT }, (_, index) => <i key={index}>✦</i>)}
        </span>
      ) : null}
    </div>
  );
}
