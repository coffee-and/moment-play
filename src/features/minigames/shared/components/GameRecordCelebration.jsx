import { GameCelebration } from "./GameCelebration.jsx";

export function GameRecordCelebration({ isNewRecord, compact = false }) {
  if (!isNewRecord) return null;

  return (
    <GameCelebration
      className="game-record-celebration"
      compact={compact}
    />
  );
}
