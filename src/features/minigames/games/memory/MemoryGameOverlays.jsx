import { Button } from "../../../../shared/components/Button.jsx";
import { ResultSubmissionStatus } from "../../../ranking/ResultSubmissionStatus.jsx";
import { GameRecordCelebration } from "../../shared/components/GameRecordCelebration.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import { formatStarRating, getStarRating } from "../../shared/gameProgression.js";
import {
  MEMORY_COUNTDOWN_LABELS,
  MEMORY_FAILURE_REASON,
  MEMORY_PHASE,
} from "./memoryGameConfig.js";

export function MemoryGameOverlays({
  cancelExit,
  combo,
  confirmExit,
  countdownIndex,
  didBreakRecordThisAttempt,
  failureReason,
  failureStatus,
  isExitConfirmOpen,
  isStageCovered,
  mistakes,
  rankingSubmission,
  requestExit,
  resetToIdle,
  resumeButtonRef,
  resumeGame,
  retryButtonRef,
  retryRound,
  round,
  score,
  startGame,
  phase,
}) {
  if (!isStageCovered) return null;

  const isStartFlow = phase === MEMORY_PHASE.IDLE || phase === MEMORY_PHASE.COUNTDOWN;
  const isTimeoutFailure = failureReason === MEMORY_FAILURE_REASON.TIMEOUT;
  const isGameOver = failureStatus === "over";
  const didFinishWithNewRecord = isGameOver && didBreakRecordThisAttempt;
  const resultTitle = isGameOver
    ? didBreakRecordThisAttempt ? "최고기록 갱신!" : "GAME OVER"
    : "한 번 더 도전해요";

  return (
    <GameStageOverlay
      className="memory-game__overlay-layer"
      state={isExitConfirmOpen ? "exit-confirm" : phase === MEMORY_PHASE.IDLE ? "start" : phase}
    >
      {isStartFlow && !isExitConfirmOpen ? (
        <GameStageModal
          className="memory-game__idle memory-game__start-flow"
          data-state={phase === MEMORY_PHASE.IDLE ? "start" : "countdown"}
          role={phase === MEMORY_PHASE.IDLE ? "dialog" : "status"}
          aria-modal={phase === MEMORY_PHASE.IDLE ? "true" : undefined}
          aria-labelledby={phase === MEMORY_PHASE.IDLE ? "memory-game-start-title" : undefined}
          aria-live={phase === MEMORY_PHASE.COUNTDOWN ? "assertive" : undefined}
        >
          <GameStageDoodle variant={phase === MEMORY_PHASE.IDLE ? "start" : "countdown"} />
          {phase === MEMORY_PHASE.IDLE ? (
            <>
              <h3 id="memory-game-start-title">순서를 기억해 보세요.</h3>
              <p>3개의 이모지부터 시작해 세 라운드마다 하나씩 늘어나요.</p>
              <Button className="memory-game__primary" type="button" onClick={startGame} disabled={rankingSubmission.isStarting}>
                {rankingSubmission.isStarting ? "랭킹 게임 준비 중…" : "게임 시작"}
              </Button>
            </>
          ) : (
            <>
              <p className="memory-game__state-kicker" aria-label={`현재 ${round}라운드`}>
                — {round} ROUND —
              </p>
              <p className="memory-game__state-title memory-game__state-title--countdown">
                {MEMORY_COUNTDOWN_LABELS[countdownIndex]}
              </p>
            </>
          )}
        </GameStageModal>
      ) : null}

      {isExitConfirmOpen ? (
        <GameStageModal
          className="memory-game__state-view"
          role="dialog"
          aria-modal="true"
          aria-labelledby="memory-game-exit-title"
        >
          <h3 className="memory-game__state-title" id="memory-game-exit-title">게임을 나갈까요?</h3>
          <p>현재 라운드 진행은 저장되지 않아요.</p>
          <div className="memory-game__state-actions game-stage-modal__actions">
            <Button type="button" onClick={cancelExit}>계속하기</Button>
            <Button type="button" variant="secondary" onClick={confirmExit}>게임 나가기</Button>
          </div>
        </GameStageModal>
      ) : null}

      {phase === MEMORY_PHASE.TURN_READY && !isExitConfirmOpen ? (
        <GameStageModal
          className="memory-game__transition-view memory-game__transition-view--turn"
          data-state="turn-ready"
          role="status"
          aria-live="polite"
        >
          <p className="memory-game__transition-title">YOUR TURN</p>
          <p className="memory-game__transition-copy">순서대로 선택하세요</p>
        </GameStageModal>
      ) : null}

      {phase === MEMORY_PHASE.CLEARED && !isExitConfirmOpen ? (
        <GameStageModal
          className="memory-game__transition-view memory-game__transition-view--clear"
          data-state="cleared"
          role="status"
          aria-live="assertive"
        >
          <p className="memory-game__transition-title">ROUND {round} CLEAR!</p>
          {combo >= 2 ? <p className="memory-game__transition-copy">{combo} COMBO</p> : null}
        </GameStageModal>
      ) : null}

      {phase === MEMORY_PHASE.REPLAYING && !isExitConfirmOpen ? (
        <GameStageModal className="memory-game__transition-view memory-game__transition-view--replay" role="status" aria-live="assertive">
          <p className="memory-game__transition-title">REPLAY!</p>
          <p className="memory-game__transition-copy">같은 라운드를 한 번 더 보여드릴게요.</p>
        </GameStageModal>
      ) : null}

      {phase === MEMORY_PHASE.COMPLETED && !isExitConfirmOpen ? (
        <GameStageModal
          celebrationStreak={Math.max(1, combo)}
          className="memory-game__state-view"
          showCompletionStars
          role="dialog"
          aria-modal="true"
        >
          <GameRecordCelebration isNewRecord={didBreakRecordThisAttempt} />
          <h3 className="memory-game__state-title">10 ROUND CLEAR!</h3>
          <p>{formatStarRating(getStarRating(1, { mistakes, maxMistakesForThree: 1 }))} · {score}점</p>
          <ResultSubmissionStatus submission={rankingSubmission} />
          <div className="memory-game__state-actions game-stage-modal__actions">
            <Button type="button" onClick={resetToIdle}>다시 도전</Button>
            <Button type="button" variant="secondary" onClick={requestExit}>게임 나가기</Button>
          </div>
        </GameStageModal>
      ) : null}

      {phase === MEMORY_PHASE.PAUSED && !isExitConfirmOpen ? (
        <GameStageModal
          className="memory-game__state-view"
          data-state="paused"
          role="dialog"
          aria-modal="true"
          aria-labelledby="memory-game-pause-title"
        >
          <h3 className="memory-game__state-title" id="memory-game-pause-title">일시정지</h3>
          <div className="memory-game__state-actions game-stage-modal__actions">
            <Button ref={resumeButtonRef} className="memory-game__state-button" type="button" onClick={resumeGame}>
              계속하기
            </Button>
            <Button className="memory-game__state-button" variant="secondary" type="button" onClick={resetToIdle}>
              처음부터 다시 시작
            </Button>
            <Button className="memory-game__state-button" variant="secondary" type="button" onClick={requestExit}>
              게임 나가기
            </Button>
          </div>
        </GameStageModal>
      ) : null}

      {phase === MEMORY_PHASE.FAILED && !isExitConfirmOpen ? (
        <GameStageModal
          className="memory-game__state-view"
          data-state="failed"
          role="dialog"
          aria-modal="true"
          aria-labelledby="memory-game-result-title"
        >
          {didFinishWithNewRecord ? (
            <GameRecordCelebration isNewRecord />
          ) : isGameOver ? (
            <GameStageDoodle variant="failure" />
          ) : null}
          <h3 className="memory-game__state-title memory-game__state-title--failed" id="memory-game-result-title">
            {resultTitle}
          </h3>
          <div className="memory-game__state-details">
            <p>{round}라운드 실패</p>
            {isTimeoutFailure ? <p>시간 초과</p> : null}
          </div>
          <ResultSubmissionStatus submission={rankingSubmission} />
          <div className="memory-game__state-actions game-stage-modal__actions">
            {failureStatus !== "over" ? (
              <Button ref={retryButtonRef} className="memory-game__state-button" type="button" onClick={retryRound}>
                남은 목숨으로 재도전
              </Button>
            ) : null}
            <Button className="memory-game__state-button" variant="secondary" type="button" onClick={resetToIdle}>
              처음부터 다시 시작
            </Button>
            <Button className="memory-game__state-button" variant="secondary" type="button" onClick={requestExit}>
              게임 나가기
            </Button>
          </div>
        </GameStageModal>
      ) : null}
    </GameStageOverlay>
  );
}
