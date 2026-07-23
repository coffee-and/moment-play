import { Button } from "../../../../shared/components/Button.jsx";
import {
  canAdvanceEndlessDifficulty,
  ENDLESS_DIFFICULTY_LABELS,
  formatEndlessMilestone,
  getNextEndlessDifficulty,
} from "../gameProgression.js";
import { GameStageModal, GameStageOverlay } from "./GameStageOverlay.jsx";

export function EndlessBlockModal({ difficulty, mistakes, onAdvance, onContinue, round, time }) {
  const canAdvance = canAdvanceEndlessDifficulty(difficulty);
  const nextDifficulty = getNextEndlessDifficulty(difficulty);

  return (
    <GameStageOverlay state="clear">
      <GameStageModal role="dialog" aria-modal="true" aria-labelledby="endless-block-title">
        <div className="game-stage-modal__eyebrow">{formatEndlessMilestone(difficulty, round)}</div>
        <h3 id="endless-block-title">10라운드를 완성했어요!</h3>
        <p>플레이 시간 {time} · 실수 {mistakes}회</p>
        <div className="game-stage-modal__actions">
          <Button onClick={onContinue}>{ENDLESS_DIFFICULTY_LABELS[difficulty]} 한 번 더</Button>
          {canAdvance ? (
            <Button variant="secondary" onClick={onAdvance}>
              {ENDLESS_DIFFICULTY_LABELS[nextDifficulty]} 도전
            </Button>
          ) : null}
        </div>
      </GameStageModal>
    </GameStageOverlay>
  );
}
