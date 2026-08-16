import gameOverFace from "../assets/doodles/game-over-face.svg";
import gameOverFacepalm from "../assets/doodles/game-over-facepalm.svg";
import recordCelebration from "../assets/doodles/record-celebration.svg";
import recordHeart from "../assets/doodles/record-heart.svg";
import startFace from "../assets/doodles/start-face.svg";
import startHands from "../assets/doodles/start-hands.svg";
import "./game-stage-doodle.css";

function DoodleArt({ asset, part }) {
  return (
    <span
      className="game-stage-doodle__art"
      data-doodle-part={part}
      style={{ "--game-stage-doodle-mask": `url("${asset}")` }}
    />
  );
}

export function GameStageDoodle({ variant, className = "" }) {
  const classes = ["game-stage-doodle", className].filter(Boolean).join(" ");

  if (variant === "failure") {
    return (
      <span
        aria-hidden="true"
        className={classes}
        data-doodle-variant={variant}
        data-modal-decoration=""
      >
        <DoodleArt asset={gameOverFace} part="sad-face" />
        <DoodleArt asset={gameOverFacepalm} part="facepalm" />
      </span>
    );
  }

  if (variant === "record") {
    return (
      <span aria-hidden="true" className={classes} data-doodle-variant={variant}>
        <DoodleArt asset={recordCelebration} part="record-face" />
        <DoodleArt asset={recordHeart} part="record-heart-left" />
        <DoodleArt asset={recordHeart} part="record-heart-right" />
      </span>
    );
  }

  if (variant === "start" || variant === "countdown") {
    return (
      <span aria-hidden="true" className={classes} data-doodle-variant={variant}>
        <DoodleArt asset={startHands} part="start-hands" />
        <DoodleArt asset={startFace} part="start-face" />
      </span>
    );
  }

  return null;
}
