import { GameStageDoodle } from "./GameStageDoodle.jsx";

export function GameCelebration({ className = "", compact = false }) {
  const classes = [
    "game-celebration",
    compact ? "game-stage-doodle--compact" : "",
    className,
  ].filter(Boolean).join(" ");

  return <GameStageDoodle className={classes} variant="record" />;
}
