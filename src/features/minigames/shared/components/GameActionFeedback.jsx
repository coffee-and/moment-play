import "../styles/game-action-feedback.css";

const STAR_COUNT = 5;

export function GameActionFeedback({ feedback, announce = true }) {
  if (!feedback) return null;

  const combo = Math.max(0, Number(feedback.combo) || 0);
  const hasCombo = combo >= 2;

  return (
    <div
      aria-atomic={announce ? "true" : undefined}
      aria-hidden={announce ? undefined : "true"}
      className={`game-action-feedback${hasCombo ? " has-combo" : ""}`}
      key={feedback.id}
      role={announce ? "status" : undefined}
    >
      {feedback.label ? <strong>{feedback.label}</strong> : null}
      {hasCombo ? <span className="game-action-feedback__combo">{combo} COMBO</span> : null}
      {hasCombo ? (
        <span className="game-action-feedback__stars" aria-hidden="true">
          {Array.from({ length: STAR_COUNT }, (_, index) => <i key={index}>✦</i>)}
        </span>
      ) : null}
    </div>
  );
}
