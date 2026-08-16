import styles from "./GameActionFeedback.module.css";

const MAX_STAR_COUNT = 9;
const BURST_RAY_COUNT = 8;
const STAR_SYMBOLS = ["✦", "✧", "•", "✦", "✧", "•", "✦", "✧", "✦"];

function getDefaultStarCount(variant, hasCombo) {
  if (variant === "major") return 9;
  if (variant === "combo" || hasCombo) return 7;
  return 5;
}

function formatAnchor(value) {
  if (typeof value === "number" && Number.isFinite(value)) return `${value}%`;
  if (typeof value === "string" && value.trim()) return value;
  return null;
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

export function GameActionFeedback({ feedback, announce = true, className = "" }) {
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
  const anchorX = formatAnchor(feedback.anchorX);
  const anchorY = formatAnchor(feedback.anchorY);
  const feedbackStyle = {
    "--game-action-feedback-duration": `${durationMs}ms`,
    ...(anchorX ? { "--game-action-feedback-x": anchorX } : {}),
    ...(anchorY ? { "--game-action-feedback-y": anchorY } : {}),
  };

  return (
    <div
      aria-atomic={announce ? "true" : undefined}
      aria-hidden={announce ? undefined : "true"}
      className={`${styles.root}${className ? ` ${className}` : ""}`}
      data-feedback-has-combo={hasCombo ? "true" : undefined}
      data-feedback-has-message={hasMessage ? "true" : "false"}
      data-feedback-tone={tone}
      data-feedback-variant={variant}
      key={feedback.id}
      role={announce ? "status" : undefined}
      style={feedbackStyle}
    >
      {tone !== "negative" ? (
        <>
          <span className={styles.rings} data-feedback-element="rings" aria-hidden="true"><i /><i /></span>
          <span className={styles.burst} data-feedback-element="burst" aria-hidden="true">
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
        <span className={styles.message} data-feedback-element="message">
          {feedback.label ? <strong className={styles.label}>{feedback.label}</strong> : null}
          {hasCombo ? <span className={styles.combo} data-feedback-element="combo">{comboLabel}</span> : null}
        </span>
      ) : null}
      {starCount > 0 ? (
        <span className={styles.stars} data-feedback-element="stars" aria-hidden="true">
          {Array.from({ length: starCount }, (_, index) => (
            <i key={index} style={getParticleStyle(index, starCount, variant)}>{STAR_SYMBOLS[index]}</i>
          ))}
        </span>
      ) : null}
    </div>
  );
}
