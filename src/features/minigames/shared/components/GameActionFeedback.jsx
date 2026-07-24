import "../styles/game-action-feedback.css";
import "../styles/game-action-feedback-effects.css";

const MAX_STAR_COUNT = 9;
const BURST_RAY_COUNT = 8;
const STAR_SYMBOLS = ["✦", "✧", "•", "✦", "✧", "•", "✦", "✧", "✦"];

function getDefaultStarCount(variant, hasCombo) {
  if (variant === "major") return 9;
  if (variant === "combo" || hasCombo) return 7;
  return 5;
}

function formatAnchor(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return `${value}%`;
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

function getParticleStyle(index, count, variant) {
  const angle = (-90 + (360 / count) * index + (index % 2 ? 8 : -5)) * (Math.PI / 180);
  const baseDistance = variant === "major" ? 58 : variant === "combo" ? 50 : variant === "compact" ? 34 : 42;
  const distance = baseDistance + (index % 3) * 5;
  const endX = Math.cos(angle) * distance;
  const endY = Math.sin(angle) * distance;

  return {
    "--particle-delay": `${(index % 4) * 26}ms`,
    "--particle-end-x": `${endX.toFixed(2)}px`,
    "--particle-end-y": `${endY.toFixed(2)}px`,
    "--particle-mid-x": `${(endX * 0.56).toFixed(2)}px`,
    "--particle-mid-y": `${(endY * 0.56).toFixed(2)}px`,
    "--particle-size": `${7 + (index % 3) * 2}px`,
  };
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
  const durationMs = feedback.durationMs ?? (hasCombo ? 920 : 760);

  return (
    <div
      aria-atomic={announce ? "true" : undefined}
      aria-hidden={announce ? undefined : "true"}
      className={`game-action-feedback is-${variant} is-${tone}${hasCombo ? " has-combo" : ""}${hasMessage ? " has-message" : " is-sparkle-only"}`}
      data-feedback-variant={variant}
      key={feedback.id}
      role={announce ? "status" : undefined}
      style={{
        "--game-action-feedback-duration": `${durationMs}ms`,
        "--game-action-feedback-x": formatAnchor(feedback.anchorX, "50%"),
        "--game-action-feedback-y": formatAnchor(feedback.anchorY, "12%"),
      }}
    >
      {tone !== "negative" ? (
        <>
          <span className="game-action-feedback__rings" aria-hidden="true"><i /><i /></span>
          <span className="game-action-feedback__burst" aria-hidden="true">
            {Array.from({ length: BURST_RAY_COUNT }, (_, index) => (
              <i
                key={index}
                style={{
                  "--ray-angle": `${index * (360 / BURST_RAY_COUNT)}deg`,
                  "--ray-delay": `${(index % 3) * 22}ms`,
                }}
              />
            ))}
          </span>
        </>
      ) : null}
      {hasMessage ? (
        <span className="game-action-feedback__message">
          {feedback.label ? <strong>{feedback.label}</strong> : null}
          {hasCombo ? <span className="game-action-feedback__combo">{comboLabel}</span> : null}
        </span>
      ) : null}
      {starCount > 0 ? (
        <span className="game-action-feedback__stars" aria-hidden="true">
          {Array.from({ length: starCount }, (_, index) => (
            <i key={index} style={getParticleStyle(index, starCount, variant)}>{STAR_SYMBOLS[index]}</i>
          ))}
        </span>
      ) : null}
    </div>
  );
}
