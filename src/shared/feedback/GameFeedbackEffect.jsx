import "./game-feedback-effect.css";

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
      <span className="game-feedback-effect__burst">
        <i className="game-feedback-effect__ray is-wide" />
        <i className="game-feedback-effect__ray is-tall" />
        <i className="game-feedback-effect__ray is-diagonal" />
        <i className="game-feedback-effect__core" />
      </span>
      <span className="game-feedback-effect__orbit">
        <i /><i /><i /><i />
      </span>
      <span className="game-feedback-effect__label">{FEEDBACK_LABEL[feedback.kind]}</span>
    </div>
  );
}
