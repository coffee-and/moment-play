import { GameStageDoodle } from "./GameStageDoodle.jsx";

export function GameRecordCelebration({ isNewRecord, compact = false }) {
  if (!isNewRecord) return null;

  return (
    <GameStageDoodle
      className={`game-record-celebration${compact ? " game-stage-doodle--compact" : ""}`}
      variant="record"
    />
  );
}
