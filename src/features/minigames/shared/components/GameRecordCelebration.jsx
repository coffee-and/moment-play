import { GameCelebration, useHasBuiltInCelebration } from "./GameCelebration.jsx";

export function GameRecordCelebration({ isNewRecord, compact = false }) {
  const hasBuiltInCelebration = useHasBuiltInCelebration();
  if (!isNewRecord || hasBuiltInCelebration) return null;

  return (
    <GameCelebration
      className="game-record-celebration"
      compact={compact}
    />
  );
}
