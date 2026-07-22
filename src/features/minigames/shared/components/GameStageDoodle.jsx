import countdownCheer from "../assets/doodles/countdown-cheer.svg";
import gameOverFace from "../assets/doodles/game-over-face.svg";
import gameOverFacepalm from "../assets/doodles/game-over-facepalm.svg";
import recordCelebration from "../assets/doodles/record-celebration.svg";
import "./game-stage-doodle.css";

const SINGLE_DOODLE_ASSETS = {
  countdown: countdownCheer,
  start: countdownCheer,
  record: recordCelebration,
};

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
        className={`${classes} game-stage-modal__decoration`}
        data-doodle-variant={variant}
      >
        <DoodleArt asset={gameOverFace} part="sad-face" />
        <DoodleArt asset={gameOverFacepalm} part="facepalm" />
      </span>
    );
  }

  const asset = SINGLE_DOODLE_ASSETS[variant];
  if (!asset) return null;

  return (
    <span aria-hidden="true" className={classes} data-doodle-variant={variant}>
      <DoodleArt asset={asset} part={variant} />
    </span>
  );
}
