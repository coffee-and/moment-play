import { GameCelebration, useGameCelebrationState } from "./GameCelebration.jsx";

export function GameRecordCelebration({ isNewRecord, compact = false }) {
  const isVictory = useGameCelebrationState();
  if (!isNewRecord && !isVictory) return null;

  return (
    <GameCelebration
      className="game-record-celebration"
      compact={compact}
    />
  );
}
