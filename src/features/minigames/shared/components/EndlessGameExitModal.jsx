import { Button } from "../../../../shared/components/Button.jsx";
import { GameStageModal, GameStageOverlay } from "./GameStageOverlay.jsx";

export function EndlessGameExitModal({ onCancel, onExit }) {
  return (
    <GameStageOverlay state="confirm">
      <GameStageModal role="dialog" aria-modal="true" aria-labelledby="endless-exit-title">
        <div className="game-stage-modal__eyebrow">LEAVE GAME</div>
        <h3 id="endless-exit-title">도전을 나갈까요?</h3>
        <p>현재 퍼즐의 진행은 저장되지 않고 종료돼요.</p>
        <div className="game-stage-modal__actions">
          <Button onClick={onExit}>나가기</Button>
          <Button variant="secondary" onClick={onCancel}>계속하기</Button>
        </div>
      </GameStageModal>
    </GameStageOverlay>
  );
}
