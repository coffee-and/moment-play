import { createContext, useContext } from "react";
import { GameStageDoodle } from "./GameStageDoodle.jsx";

const BuiltInCelebrationContext = createContext(false);

export function BuiltInCelebrationProvider({ children, enabled = false }) {
  return (
    <BuiltInCelebrationContext.Provider value={enabled}>
      {children}
    </BuiltInCelebrationContext.Provider>
  );
}

export function useHasBuiltInCelebration() {
  return useContext(BuiltInCelebrationContext);
}

export function GameCelebration({ className = "", compact = false }) {
  const classes = [
    "game-celebration",
    compact ? "game-stage-doodle--compact" : "",
    className,
  ].filter(Boolean).join(" ");

  return <GameStageDoodle className={classes} variant="record" />;
}
