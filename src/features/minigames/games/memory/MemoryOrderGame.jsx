import { Button } from "../../../../shared/components/Button.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { MEMORY_ORDER_ROUNDS } from "./memoryOrder.logic.js";
import { MemoryGameBoard } from "./MemoryGameBoard.jsx";
import { MemoryGameOverlays } from "./MemoryGameOverlays.jsx";
import { memoryClassName as cx } from "./memoryStyles.js";
import { useMemoryOrderGame } from "./useMemoryOrderGame.js";

const DEFAULT_GAME_META = {
  eyebrow: "MEMORY / ORDER",
  title: "Memory Sequence",
  description: "제한 시간 동안 순서를 기억하고 그대로 선택하세요.",
};

export { MEMORY_SYMBOLS, MEMORY_TIMING, isMemoryTimerUrgent } from "./memoryGameConfig.js";
export { MEMORY_PHASE as MEMORY_TIMER_PHASE } from "./memoryGameConfig.js";

export function MemoryOrderGame({ game = DEFAULT_GAME_META }) {
  const controller = useMemoryOrderGame();
  const {
    canPause, pauseGame, requestExit, score, combo, round, lives, replayGauge,
    correctAnnouncement, correctFeedback, data, isTimerUrgent, choose, phase, remainingMs,
    sequenceDensity, step, cancelExit, confirmExit, countdownIndex, didBreakRecordThisAttempt,
    failureReason, failureStatus, isExitConfirmOpen, isStageCovered, mistakes, rankingSubmission,
    resetToIdle, resumeGame, retryRound, startGame,
  } = controller;
  const gameActions = (
    <>
      {canPause ? <Button className={cx("memory-game__pause")} variant="secondary" type="button" onClick={pauseGame}>일시정지</Button> : null}
      <Button variant="secondary" type="button" onClick={requestExit}>게임 나가기</Button>
    </>
  );
  const sidebar = (
    <>
      <div className={cx("stat-row")}>
        <div className={cx("stat")}><div className={cx("l")}>Score</div><div className={cx("v")}>{score}</div></div>
        <div className={cx("stat")}><div className={cx("l")}>Combo</div><div className={cx("v")}>×{combo}</div></div>
        <div className={cx("stat")}><div className={cx("l")}>Round</div><div className={cx("v")}>{Math.min(round, MEMORY_ORDER_ROUNDS)}<small> / {MEMORY_ORDER_ROUNDS}</small></div></div>
        <div className={cx("stat")}><div className={cx("l")}>Lives</div><div className={cx("v")}>{lives}</div></div>
      </div>
      <p className={cx("game-stage__side-note")}>다시 보기 {replayGauge}% {replayGauge >= 100 ? "· READY" : ""}</p>
    </>
  );

  return (
    <GameStage className={cx("memory-game")} eyebrow={game.eyebrow} title={game.title} actions={gameActions} sidebar={sidebar} ariaLabel={game.title}>
      <MemoryGameBoard correctAnnouncement={correctAnnouncement} correctFeedback={correctFeedback} data={data} isTimerUrgent={isTimerUrgent} onChoose={choose} phase={phase} remainingMs={remainingMs} round={round} sequenceDensity={sequenceDensity} step={step} />
      <MemoryGameOverlays cancelExit={cancelExit} combo={combo} confirmExit={confirmExit} countdownIndex={countdownIndex} didBreakRecordThisAttempt={didBreakRecordThisAttempt} failureReason={failureReason} failureStatus={failureStatus} isExitConfirmOpen={isExitConfirmOpen} isStageCovered={isStageCovered} mistakes={mistakes} phase={phase} rankingSubmission={rankingSubmission} requestExit={requestExit} resetToIdle={resetToIdle} resumeGame={resumeGame} retryRound={retryRound} round={round} score={score} startGame={startGame} />
    </GameStage>
  );
}
