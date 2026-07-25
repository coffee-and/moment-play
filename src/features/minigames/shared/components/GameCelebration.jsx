import { createContext, useContext } from "react";
import { GameStageDoodle } from "./GameStageDoodle.jsx";

const GameCelebrationContext = createContext(false);

export function GameCelebrationProvider({ children, enabled = false }) {
  return (
    <GameCelebrationContext.Provider value={enabled}>
      {children}
    </GameCelebrationContext.Provider>
  );
}

export function useGameCelebrationState() {
  return useContext(GameCelebrationContext);
}

export function GameCelebration({ className = "", compact = false }) {
  const classes = [
    "game-celebration",
    compact ? "game-stage-doodle--compact" : "",
    className,
  ].filter(Boolean).join(" ");

  return <GameStageDoodle className={classes} variant="record" />;
}
