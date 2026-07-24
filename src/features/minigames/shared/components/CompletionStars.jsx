import "../styles/completion-stars.css";

const STAR_POSITIONS = [
  [7, 28, 0.72, -18], [14, 10, 0.94, -10], [24, 2, 0.64, -20], [35, 8, 1.08, -14],
  [48, 1, 0.82, -24], [61, 7, 1.16, -16], [73, 0, 0.7, -22], [86, 11, 0.98, -12],
  [94, 30, 0.76, -18], [3, 50, 0.58, -10], [97, 54, 0.64, -14], [20, 30, 0.54, -20],
  [80, 34, 0.62, -22], [31, -2, 0.52, -16], [68, -3, 0.56, -18], [50, 16, 0.48, -12],
];

export function getCompletionStarCount(streak) {
  const safeStreak = Math.max(0, Math.floor(Number(streak) || 0));
  if (safeStreak >= 10) return 16;
  if (safeStreak >= 5) return 14;
  if (safeStreak >= 3) return 11;
  if (safeStreak === 2) return 9;
  return safeStreak === 1 ? 7 : 0;
}

export function CompletionStars({ streak = 1 }) {
  const count = getCompletionStarCount(streak);
  if (!count) return null;

  return (
    <span
      aria-hidden="true"
      className="game-stage-modal__decoration completion-stars"
      data-intensity={streak >= 10 ? "maximum" : streak >= 5 ? "strong" : streak >= 3 ? "medium" : "soft"}
    >
      {STAR_POSITIONS.slice(0, count).map(([left, top, scale, lift], index) => (
        <i
          key={`${left}-${top}`}
          style={{
            "--completion-star-delay": `${(index % 6) * 45}ms`,
            "--completion-star-left": `${left}%`,
            "--completion-star-lift": `${lift}px`,
            "--completion-star-scale": scale,
            "--completion-star-top": `${top}%`,
          }}
        >
          ✦
        </i>
      ))}
    </span>
  );
}
