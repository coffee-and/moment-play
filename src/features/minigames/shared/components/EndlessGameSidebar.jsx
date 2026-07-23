import { ENDLESS_DIFFICULTY_LABELS, getEndlessRoundProgress } from "../gameProgression.js";

export function EndlessGameSidebar({ difficulty, mistakes, round, time }) {
  const progress = getEndlessRoundProgress(round);
  return (
    <div className="stat-row">
      <div className="stat"><div className="l">Mode</div><div className="v">{ENDLESS_DIFFICULTY_LABELS[difficulty]}</div></div>
      <div className="stat"><div className="l">Round</div><div className="v">{round}</div></div>
      <div className="stat"><div className="l">Block</div><div className="v">{progress.blockRound}/10</div></div>
      <div className="stat"><div className="l">Time</div><div className="v">{time}</div></div>
      <div className="game-stage__side-note">실수 {mistakes}회</div>
    </div>
  );
}
