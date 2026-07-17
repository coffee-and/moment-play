import "./game-feedback-effect.css";

const PARTICLES = [
  ["12%", "40%", "-18deg", "0ms"],
  ["22%", "26%", "14deg", "34ms"],
  ["34%", "18%", "-8deg", "68ms"],
  ["48%", "13%", "20deg", "18ms"],
  ["62%", "18%", "-16deg", "82ms"],
  ["76%", "27%", "10deg", "48ms"],
  ["87%", "42%", "-22deg", "96ms"],
  ["80%", "62%", "18deg", "62ms"],
  ["66%", "75%", "-12deg", "112ms"],
  ["50%", "82%", "24deg", "42ms"],
  ["32%", "75%", "-20deg", "88ms"],
  ["18%", "62%", "12deg", "24ms"],
];

const FEEDBACK_LABEL = {
  start: "GO!",
  positive: "NICE",
  perfect: "PERFECT",
  clear: "CLEAR!",
  negative: "MISS",
  "game-over": "GAME OVER",
};

export function GameFeedbackEffect({ feedback }) {
  if (!feedback) return null;

  return (
    <div
      className={`game-feedback-effect is-${feedback.kind}`}
      key={feedback.id}
      aria-hidden="true"
    >
      <span className="game-feedback-effect__flash" />
      <span className="game-feedback-effect__ring" />
      <span className="game-feedback-effect__label">{FEEDBACK_LABEL[feedback.kind]}</span>
      <span className="game-feedback-effect__particles">
        {PARTICLES.map(([left, top, rotate, delay], index) => (
          <i
            key={`${left}-${top}`}
            style={{ "--particle-x": left, "--particle-y": top, "--particle-rotate": rotate, "--particle-delay": delay }}
          >
            {index % 3 === 0 ? "✦" : index % 3 === 1 ? "·" : "✧"}
          </i>
        ))}
      </span>
    </div>
  );
}
