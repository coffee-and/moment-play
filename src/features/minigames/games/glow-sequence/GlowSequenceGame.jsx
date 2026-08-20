import { Button } from "../../../../shared/components/Button.jsx";
import { bindCssModule } from "../../../../shared/styles/bindCssModule.js";
import { GameRecordCelebration } from "../../shared/components/GameRecordCelebration.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import { GAME_COLOR_PALETTE } from "../../shared/gameColorPalette.js";
import {
  GLOW_SEQUENCE_MASTER_END_ROUND,
  GLOW_SEQUENCE_MASTER_LENGTH,
  GLOW_SEQUENCE_PHASE,
  GLOW_SEQUENCE_STANDARD_END_ROUND,
} from "./glowSequence.config.js";
import styles from "./glow-sequence.module.css";
import { isGlowMilestoneRound } from "./glowSequence.logic.js";
import { useGlowSequenceGame } from "./useGlowSequenceGame.js";

const cx = bindCssModule(styles);
const CELL_COLORS = GAME_COLOR_PALETTE.map((color) => color.value);

function getStatusText({ inputStep, isMilestone, phase, round }) {
  if (phase === GLOW_SEQUENCE_PHASE.IDLE) return "빛의 순서를 끝까지 이어보세요";
  if (phase === GLOW_SEQUENCE_PHASE.SHOWING) return "순서를 기억하세요";
  if (phase === GLOW_SEQUENCE_PHASE.RETRY) return "한 번 더 보여드릴게요";
  if (phase === GLOW_SEQUENCE_PHASE.ROUND_CLEARED) {
    return `ROUND ${round} CLEAR${isMilestone ? "!" : ""}`;
  }
  return `${inputStep + 1}번째 칸을 선택하세요`;
}

export function GlowSequenceGame({ game }) {
  const controller = useGlowSequenceGame();
  const {
    activeCell,
    bestRound,
    cancelExit,
    cells,
    chooseCell,
    confirmExit,
    continueToMaster,
    didBreakRecordThisAttempt,
    gridSize,
    inputStep,
    isExitOpen,
    mistakes,
    phase,
    requestExit,
    round,
    roundLimit,
    sequenceLength,
    startGame,
  } = controller;
  const isRoundMilestone = phase === GLOW_SEQUENCE_PHASE.ROUND_CLEARED && isGlowMilestoneRound(round);
  const statusText = getStatusText({ inputStep, isMilestone: isRoundMilestone, phase, round });

  const sidebar = (
    <div className="stat-row">
      <div className="stat"><div className="l">Round</div><div className="v">{round}/{roundLimit}</div></div>
      <div className="stat"><div className="l">Sequence</div><div className="v">{sequenceLength}</div></div>
      <div className="stat"><div className="l">Grid</div><div className="v">{gridSize}×{gridSize}</div></div>
      <div className="stat"><div className="l">Mistakes</div><div className="v">{mistakes}</div></div>
      <div className="game-stage__side-note">최고 기록 {bestRound ? `${bestRound}라운드` : "도전 전"}</div>
    </div>
  );

  return (
    <GameStage
      actions={<Button variant="secondary" onClick={requestExit}>게임 나가기</Button>}
      ariaLabel="글로우 시퀀스 게임"
      className={cx("glow-sequence")}
      eyebrow="MEMORY / LIGHT"
      sidebar={sidebar}
      title={game.title}
    >
      <div className={cx("glow-sequence__game")}>
        <div
          className={cx(`glow-sequence__status${isRoundMilestone ? " is-milestone" : ""}`)}
          aria-live="polite"
        >
          <span>ROUND {round} · {sequenceLength} CELLS</span>
          <strong>{statusText}</strong>
          {phase === GLOW_SEQUENCE_PHASE.ROUND_CLEARED && bestRound === round ? <small>NEW BEST</small> : null}
        </div>

        <div
          className={cx("glow-sequence__grid")}
          data-size={gridSize}
          role="grid"
          aria-label={`${gridSize} 곱하기 ${gridSize} 빛 순서 보드`}
        >
          {cells.map((cell) => (
            <button
              aria-label={`${cell + 1}번 칸`}
              className={cx(`glow-sequence__cell${activeCell === cell ? " is-active" : ""}`)}
              disabled={phase !== GLOW_SEQUENCE_PHASE.INPUT}
              key={cell}
              onClick={() => chooseCell(cell)}
              style={{ "--cell-color": CELL_COLORS[cell % CELL_COLORS.length] }}
              type="button"
            />
          ))}
        </div>

        {phase === GLOW_SEQUENCE_PHASE.INPUT ? (
          <div className={cx("glow-sequence__progress")} aria-hidden="true">
            <span style={{ width: `${(inputStep / sequenceLength) * 100}%` }} />
          </div>
        ) : null}
      </div>

      {phase === GLOW_SEQUENCE_PHASE.IDLE ? (
        <GameStageOverlay state="start">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="glow-start-title">
            <GameStageDoodle variant="start" />
            <div className="game-stage-modal__eyebrow">MEMORY / LIGHT</div>
            <h3 id="glow-start-title">빛나는 순서를 기억하세요</h3>
            <p>{GLOW_SEQUENCE_STANDARD_END_ROUND}라운드 기본 코스를 완료한 뒤 MASTER 도전을 이어갈 수 있어요.</p>
            <Button onClick={startGame}>게임 시작</Button>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === GLOW_SEQUENCE_PHASE.STANDARD_COMPLETE ? (
        <GameStageOverlay state="complete">
          <GameStageModal
            celebrationStreak={5}
            showCompletionStars
            role="dialog"
            aria-modal="true"
            aria-labelledby="glow-standard-title"
          >
            <GameRecordCelebration isNewRecord={didBreakRecordThisAttempt} />
            <div className="game-stage-modal__eyebrow">{GLOW_SEQUENCE_STANDARD_END_ROUND} ROUNDS COMPLETE</div>
            <h3 id="glow-standard-title">기본 코스 완료!</h3>
            <p>실수 {mistakes}회로 기본 코스를 마쳤어요. 계속 도전하면 {GLOW_SEQUENCE_MASTER_END_ROUND}라운드의 {GLOW_SEQUENCE_MASTER_LENGTH}칸 MASTER에 도전할 수 있어요.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={continueToMaster}>MASTER 도전 계속</Button>
              <Button variant="secondary" onClick={confirmExit}>홈으로</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === GLOW_SEQUENCE_PHASE.MASTER_COMPLETE ? (
        <GameStageOverlay state="complete">
          <GameStageModal
            celebrationStreak={10}
            showCompletionStars
            role="dialog"
            aria-modal="true"
            aria-labelledby="glow-master-title"
          >
            <GameRecordCelebration isNewRecord={didBreakRecordThisAttempt} />
            <div className="game-stage-modal__eyebrow">{GLOW_SEQUENCE_MASTER_END_ROUND} ROUNDS COMPLETE</div>
            <h3 id="glow-master-title">MASTER 달성!</h3>
            <p>{GLOW_SEQUENCE_MASTER_LENGTH}개의 빛 순서를 모두 기억했어요. 실수 {mistakes}회로 최종 단계를 완료했습니다.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={startGame}>다시 도전</Button>
              <Button variant="secondary" onClick={confirmExit}>홈으로</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {isExitOpen ? (
        <GameStageOverlay state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="glow-exit-title">
            <div className="game-stage-modal__eyebrow">LEAVE GAME</div>
            <h3 id="glow-exit-title">도전을 나갈까요?</h3>
            <p>최고 라운드는 저장되지만 현재 진행 중인 순서는 종료돼요.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={confirmExit}>나가기</Button>
              <Button variant="secondary" onClick={cancelExit}>계속하기</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
