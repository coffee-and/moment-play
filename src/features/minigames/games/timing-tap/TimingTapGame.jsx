import { Button } from "../../../../shared/components/Button.jsx";
import { formatStarRating } from "../../shared/gameProgression.js";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameActionFeedback } from "../../shared/components/GameActionFeedback.jsx";
import { GameCelebration } from "../../shared/components/GameCelebration.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import feedbackStyles from "./timing-tap-feedback.module.css";
import { bindCssModule } from "../../../../shared/styles/bindCssModule.js";
import styles from "./timing-tap.module.css";
import { TIMING_TAP_ROUNDS } from "./timingTap.logic.js";
import { useTimingTapGame } from "./useTimingTapGame.js";

const cx = bindCssModule(styles);

export function TimingTapGame({ game }) {
  const {
    round,
    score,
    perfectCombo,
    focusGauge,
    requestExit,
    isExitOpen,
    phase,
    roundConfig,
    result,
    needlePosition,
    tapNow,
    startGame,
    starRating,
    average,
    best,
    continueGame,
    navigateFromGame,
  } = useTimingTapGame();
  const sidebar = (
    <div className={cx("stat-row")}>
      <div className={cx("stat")}><div className={cx("l")}>Round</div><div className={cx("v")}>{Math.min(round, TIMING_TAP_ROUNDS)}/{TIMING_TAP_ROUNDS}</div></div>
      <div className={cx("stat")}><div className={cx("l")}>Score</div><div className={cx("v")}>{score}</div></div>
      <div className={cx("stat")}><div className={cx("l")}>Combo</div><div className={cx("v")}>×{perfectCombo}</div></div>
      <div className={cx("stat")}><div className={cx("l")}>Focus</div><div className={cx("v")}>{focusGauge}%</div></div>
    </div>
  );

  return (
    <GameStage
      actions={<Button variant="secondary" onClick={requestExit}>게임 나가기</Button>}
      ariaLabel="타이밍 탭 게임"
      className={cx("timing-tap")}
      eyebrow="REACTION / TIMING"
      isPaused={isExitOpen}
      sidebar={sidebar}
      title={game.title}
    >
      <div className={cx("timing-tap__game")}>
        <div className={cx("timing-tap__round-copy")}>
          <span>{phase === "idle" ? "READY" : roundConfig.focusAssisted ? `ROUND ${Math.min(round, TIMING_TAP_ROUNDS)} · FOCUS` : `ROUND ${Math.min(round, TIMING_TAP_ROUNDS)}`}</span>
          <strong>{result?.grade ?? (phase === "completed" ? "COMPLETE" : "목표 구간에 맞춰 탭!")}</strong>
        </div>

        <div
          aria-label="타이밍 게이지"
          className={cx("timing-tap__track", feedbackStyles.host, result ? `is-${result.grade.toLowerCase()}` : "")}
          data-feedback-result={result?.grade.toLowerCase()}
        >
          <span
            className={cx(`timing-tap__target ${feedbackStyles.target}`)}
            style={{
              left: `${roundConfig.targetCenter - roundConfig.targetWidth / 2}%`,
              width: `${roundConfig.targetWidth}%`,
            }}
          />
          <span className={cx("timing-tap__needle")} data-timing-needle="" style={{ left: `${needlePosition}%` }} />
          <span className={cx("timing-tap__track-line")} />
          <GameActionFeedback
            announce={false}
            className={feedbackStyles.feedback}
            feedback={phase === "feedback" && result?.grade === "PERFECT"
              ? {
                id: round,
                label: perfectCombo >= 2 ? `PERFECT ×${perfectCombo}` : "PERFECT!",
                durationMs: perfectCombo >= 2 ? 1080 : 840,
                showStars: perfectCombo >= 2,
                variant: perfectCombo >= 2 ? "combo" : "standard",
              }
              : null}
          />
        </div>

        {phase === "playing" ? (
          <button className={cx("timing-tap__tap-button")} type="button" onClick={tapNow}>
            <span>TAP</span>
            <small>Space · Enter</small>
          </button>
        ) : null}
        {phase === "feedback" ? (
          <div className={cx("timing-tap__feedback")} aria-live="polite">
            <strong>+{result.points}</strong>
            <span>{result.grade === "PERFECT" ? `PERFECT 콤보 ×${result.multiplier}` : result.grade === "MISS" ? "콤보가 초기화됐어요" : "좋아요!"}</span>
          </div>
        ) : null}
      </div>

      {phase === "idle" ? (
        <GameStageOverlay state="start">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="timing-start-title">
            <GameStageDoodle variant="start" />
            <div className={cx("game-stage-modal__eyebrow")}>REACTION / TIMING</div>
            <h3 id="timing-start-title">목표 구간에 맞춰 탭!</h3>
            <p>움직이는 바늘이 목표 구간에 들어왔을 때 탭하세요.</p>
            <Button onClick={startGame}>게임 시작</Button>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === "completed" ? (
        <GameStageOverlay state="complete">
          <GameStageModal
            celebrationStreak={Math.max(1, perfectCombo)}
            showCompletionStars
            role="dialog"
            aria-modal="true"
            aria-labelledby="timing-complete-title"
          >
            <GameCelebration />
            <div className={cx("game-stage-modal__eyebrow")}>REACTION COMPLETE</div>
            <h3 id="timing-complete-title">{score}점</h3>
            <p>{formatStarRating(starRating)} · 10라운드 평균 {average}점 · 최고 {Math.max(best, score)}점</p>
            <Button onClick={startGame}>다시 도전</Button>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {isExitOpen ? (
        <GameStageOverlay closeOnEscape onClose={continueGame} state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="timing-exit-title">
            <div className={cx("game-stage-modal__eyebrow")}>LEAVE GAME</div>
            <h3 id="timing-exit-title">타이밍 도전을 나갈까요?</h3>
            <p>현재 라운드 기록은 저장되지 않아요.</p>
            <div className={cx("game-stage-modal__actions")}>
              <Button onClick={() => navigateFromGame("/")}>나가기</Button>
              <Button data-modal-initial-focus="" variant="secondary" onClick={continueGame}>계속하기</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
