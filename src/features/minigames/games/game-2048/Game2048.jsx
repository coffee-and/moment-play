import { Button } from "../../../../shared/components/Button.jsx";
import { ResultSubmissionStatus } from "../../../ranking/ResultSubmissionStatus.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameRecordCelebration } from "../../shared/components/GameRecordCelebration.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import { bindCssModule } from "../../../../shared/styles/bindCssModule.js";
import { BOARD_SIZE, FINAL_TARGET_TILE, GAME_2048_COPY, GAME_2048_PHASE } from "./game2048.constants.js";
import styles from "./game-2048.module.css";
import { formatNumber, getNextTargetLabel, getTileSizeClass, useGame2048 } from "./useGame2048.js";

const cx = bindCssModule(styles);
const DEFAULT_GAME_META = { eyebrow: "NUMBER / MERGE", title: "2048", description: "목표 타일을 차례로 완성해 2048에 도전하세요." };

export function Game2048({ game = DEFAULT_GAME_META }) {
  const {
    hasStarted,
    requestNewGame,
    requestExit,
    phase,
    round,
    currentTarget,
    score,
    bestScore,
    phaseStatus,
    maxTile,
    boardElementRef,
    handleBoardKeyDown,
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    board,
    emptyCellCount,
    isStageCovered,
    isExitConfirmOpen,
    isResetConfirmOpen,
    startNewGame,
    rankingSubmission,
    setIsExitConfirmOpen,
    confirmExit,
    targetIndex,
    continueToNextTarget,
    didBreakRecordThisAttempt,
    continueEndless,
    closeResetConfirm,
  } = useGame2048();
  const gameActions = (
    <div className={cx("game-stage__inline-actions")}>
      {hasStarted ? <Button type="button" variant="secondary" onClick={requestNewGame}>{GAME_2048_COPY.reset.newGameButton}</Button> : null}
      <Button type="button" variant="secondary" onClick={requestExit}>게임 나가기</Button>
    </div>
  );

  const sidebar = (
    <>
      <div className={cx("stat-row")}>
        <div className={cx("stat")}><div className={cx("l")}>Round</div><div className={cx("v")}>{phase === GAME_2048_PHASE.ENDLESS ? "∞" : round}</div></div>
        <div className={cx("stat")}><div className={cx("l")}>Target</div><div className={cx("v")}>{phase === GAME_2048_PHASE.ENDLESS ? "End" : formatNumber(currentTarget)}</div></div>
        <div className={cx("stat")}><div className={cx("l")}>Score</div><div className={cx("v")}>{formatNumber(score)}</div></div>
        <div className={cx("stat")}><div className={cx("l")}>Best</div><div className={cx("v")}>{formatNumber(bestScore)}</div></div>
      </div>
      <p className={cx("game-stage__side-note")}>데스크톱에서는 방향키로, 터치 화면에서는 스와이프로 이동해요.</p>
    </>
  );

  return (
    <GameStage className={cx("game-2048")} eyebrow={game.eyebrow} title={game.title} actions={gameActions} sidebar={sidebar} ariaLabel="2048 게임">
      <div className={cx("game-2048__stage-content")}>
        {phase !== GAME_2048_PHASE.IDLE ? (
          <>
            <section className={cx("game-2048__meta")} aria-label="2048 게임 정보">
              <div><span>ROUND</span><strong>{phase === GAME_2048_PHASE.ENDLESS ? "COMPLETE" : round}</strong></div>
              <div><span>{phase === GAME_2048_PHASE.ENDLESS ? "MODE" : "TARGET"}</span><strong>{phase === GAME_2048_PHASE.ENDLESS ? "ENDLESS" : formatNumber(currentTarget)}</strong></div>
              <div><span>SCORE</span><strong>{formatNumber(score)}</strong></div>
              <div><span>BEST</span><strong>{formatNumber(bestScore)}</strong></div>
            </section>
            <p className={cx("visually-hidden")} aria-live="polite">{phaseStatus}. 현재 점수 {formatNumber(score)}점, 최고 점수 {formatNumber(bestScore)}점, 최대 타일 {formatNumber(maxTile)}.</p>
            <div ref={boardElementRef} className={cx("game-2048__board")} role="grid" tabIndex={0} aria-label="2048 게임 보드. 방향키 또는 스와이프로 타일을 이동하세요." aria-rowcount={BOARD_SIZE} aria-colcount={BOARD_SIZE} onKeyDown={handleBoardKeyDown} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel}>
              {board.map((value, index) => {
                const row = Math.floor(index / BOARD_SIZE) + 1;
                const column = (index % BOARD_SIZE) + 1;
                const label = value ? `${row}행 ${column}열, 숫자 ${value}` : `${row}행 ${column}열, 빈칸`;
                return (
                  <div className={cx(`game-2048__cell ${value ? `has-value ${getTileSizeClass(value)}` : "is-empty"}${phase === GAME_2048_PHASE.MILESTONE_CLEAR && value === currentTarget ? " is-target-reached" : ""}`)} data-value={value} role="gridcell" aria-label={label} key={`${row}-${column}`}>
                    {value ? <span>{value}</span> : null}
                  </div>
                );
              })}
            </div>
            <p className={cx("game-2048__hint")}><span>{GAME_2048_COPY.guidance.gameOverRule}</span><span>{GAME_2048_COPY.guidance.move} 빈칸 {emptyCellCount}칸 · 최대 타일 {formatNumber(maxTile)}</span></p>
          </>
        ) : null}
      </div>
      {isStageCovered ? (
        <GameStageOverlay className={cx("game-2048__overlay-layer")} state={isExitConfirmOpen ? "exit-confirm" : isResetConfirmOpen ? "reset-confirm" : phase === GAME_2048_PHASE.IDLE ? "start" : phase}>
          {phase === GAME_2048_PHASE.IDLE && !isResetConfirmOpen && !isExitConfirmOpen ? (
            <GameStageModal className={cx("game-2048__modal game-2048__start-modal")} role="dialog" aria-modal="true" aria-labelledby="game-2048-start-title">
              <GameStageDoodle variant="start" />
              <p className={cx("game-2048__modal-eyebrow")}>{GAME_2048_COPY.start.eyebrow}</p>
              <p className={cx("game-2048__target-label")}>{GAME_2048_COPY.start.targetLabel}</p>
              <strong className={cx("game-2048__target-value")}>{formatNumber(currentTarget)}</strong>
              <h3 id="game-2048-start-title">{formatNumber(currentTarget)} 타일부터 시작해요.</h3>
              <p>{GAME_2048_COPY.start.description}</p>
              <Button type="button" onClick={startNewGame} disabled={rankingSubmission.isStarting}>
                {rankingSubmission.isStarting ? "랭킹 게임 준비 중…" : GAME_2048_COPY.start.startButton}
              </Button>
            </GameStageModal>
          ) : null}
          {isExitConfirmOpen ? (
            <GameStageModal className={cx("game-2048__modal")} role="dialog" aria-modal="true" aria-labelledby="game-2048-exit-title">
              <h3 id="game-2048-exit-title">게임을 나갈까요?</h3>
              <p>현재 게임 진행은 저장되지 않아요.</p>
              <div className={cx("game-stage-modal__actions")}>
                <Button type="button" onClick={() => setIsExitConfirmOpen(false)}>계속하기</Button>
                <Button type="button" variant="secondary" onClick={confirmExit}>게임 나가기</Button>
              </div>
            </GameStageModal>
          ) : null}
          {phase === GAME_2048_PHASE.MILESTONE_CLEAR && !isResetConfirmOpen && !isExitConfirmOpen ? (
            <GameStageModal className={cx("game-2048__modal")} role="dialog" aria-modal="true" aria-labelledby="game-2048-milestone-title">
              <p className={cx("game-2048__modal-eyebrow")}>ROUND {round} CLEAR</p>
              <h3 id="game-2048-milestone-title">{formatNumber(currentTarget)} 타일을 완성했어요.</h3>
              <p>{GAME_2048_COPY.milestone.nextTargetLabel}</p>
              <strong>{formatNumber(getNextTargetLabel(targetIndex))}</strong>
              <Button type="button" onClick={continueToNextTarget}>{GAME_2048_COPY.milestone.nextButtonLabel} {formatNumber(getNextTargetLabel(targetIndex))}</Button>
            </GameStageModal>
          ) : null}
          {phase === GAME_2048_PHASE.COMPLETED && !isResetConfirmOpen && !isExitConfirmOpen ? (
            <GameStageModal
              celebrationStreak={5}
              className={cx("game-2048__modal game-2048__modal--complete")}
              showCompletionStars
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-2048-complete-title"
            >
              <GameRecordCelebration isNewRecord={didBreakRecordThisAttempt} />
              <p className={cx("game-2048__modal-eyebrow")}>{GAME_2048_COPY.completed.eyebrow}</p>
              <h3 id="game-2048-complete-title">{FINAL_TARGET_TILE} {GAME_2048_COPY.completed.title}</h3>
              <p>{GAME_2048_COPY.completed.description}</p>
              <p>{GAME_2048_COPY.completed.detail}</p>
              <ResultSubmissionStatus submission={rankingSubmission} />
              <div className={cx("game-stage-modal__actions")}>
                <Button type="button" onClick={continueEndless}>{GAME_2048_COPY.completed.continueButton}</Button>
                <Button type="button" variant="secondary" onClick={startNewGame} disabled={rankingSubmission.isStarting}>{GAME_2048_COPY.completed.newGameButton}</Button>
              </div>
            </GameStageModal>
          ) : null}
          {phase === GAME_2048_PHASE.GAME_OVER && !isResetConfirmOpen && !isExitConfirmOpen ? (
            <GameStageModal className={cx("game-2048__modal")} role="dialog" aria-modal="true" aria-labelledby="game-2048-game-over-title">
              <GameRecordCelebration isNewRecord={didBreakRecordThisAttempt} />
              <h3 id="game-2048-game-over-title">{GAME_2048_COPY.gameOver.title}</h3>
              <p>{GAME_2048_COPY.gameOver.scoreLabel}</p>
              <strong>{formatNumber(score)}</strong>
              <p>{GAME_2048_COPY.gameOver.maxTileLabel} {formatNumber(maxTile)}</p>
              <ResultSubmissionStatus submission={rankingSubmission} />
              <Button type="button" onClick={startNewGame} disabled={rankingSubmission.isStarting}>{GAME_2048_COPY.gameOver.newGameButton}</Button>
            </GameStageModal>
          ) : null}
          {isResetConfirmOpen && !isExitConfirmOpen ? (
            <GameStageModal className={cx("game-2048__modal")} role="dialog" aria-modal="true" aria-labelledby="game-2048-reset-title">
              <h3 id="game-2048-reset-title">{GAME_2048_COPY.reset.title}</h3>
              <p>{GAME_2048_COPY.reset.description}</p>
              <div className={cx("game-stage-modal__actions")}>
                <Button type="button" variant="secondary" onClick={closeResetConfirm}>{GAME_2048_COPY.reset.continueButton}</Button>
                <Button type="button" onClick={startNewGame} disabled={rankingSubmission.isStarting}>{GAME_2048_COPY.reset.newGameButton}</Button>
              </div>
            </GameStageModal>
          ) : null}
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
