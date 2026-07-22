import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { formatStarRating, getStarRating } from "../../shared/gameProgression.js";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import "./timing-tap.css";
import {
  TIMING_TAP_ROUNDS,
  TIMING_TAP_MAX_SCORE,
  getNeedlePosition,
  getTimingRoundConfig,
  judgeTiming,
  scoreTimingResult,
} from "./timingTap.logic.js";

const TIMING_BEST_KEY = "eunContents.timingTap.best";

function readBestScore() {
  try {
    const score = Number(window.localStorage.getItem(TIMING_BEST_KEY));
    return Number.isFinite(score) ? Math.max(0, score) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    window.localStorage.setItem(TIMING_BEST_KEY, String(score));
  } catch {
    return;
  }
}

function vibrate(duration = 10) {
  globalThis.navigator?.vibrate?.(duration);
}

export function TimingTapGame({ game }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const [phase, setPhase] = useState("idle");
  const [round, setRound] = useState(1);
  const [roundConfig, setRoundConfig] = useState(() => getTimingRoundConfig(1));
  const [needlePosition, setNeedlePosition] = useState(0);
  const [score, setScore] = useState(0);
  const [perfectCombo, setPerfectCombo] = useState(0);
  const [focusGauge, setFocusGauge] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [best, setBest] = useState(readBestScore);
  const [result, setResult] = useState(null);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const frameRef = useRef(null);
  const roundStartRef = useRef(0);
  const feedbackTimerRef = useRef(null);
  const phaseRef = useRef(phase);
  const roundRef = useRef(round);
  const scoreRef = useRef(score);
  const perfectComboRef = useRef(perfectCombo);
  const focusGaugeRef = useRef(focusGauge);

  phaseRef.current = phase;
  roundRef.current = round;
  scoreRef.current = score;
  perfectComboRef.current = perfectCombo;
  focusGaugeRef.current = focusGauge;

  function beginRound(nextRound) {
    playSound("countdownFinal");
    const useFocusAssist = focusGaugeRef.current >= 100;
    const config = getTimingRoundConfig(nextRound, Math.random, useFocusAssist ? 4 : 0);
    if (useFocusAssist) {
      focusGaugeRef.current = 0;
      setFocusGauge(0);
    }
    setRound(nextRound);
    setRoundConfig(config);
    setNeedlePosition(0);
    setResult(null);
    roundStartRef.current = performance.now();
    setPhase("playing");
  }

  function startGame() {
    window.clearTimeout(feedbackTimerRef.current);
    scoreRef.current = 0;
    perfectComboRef.current = 0;
    focusGaugeRef.current = 0;
    setScore(0);
    setPerfectCombo(0);
    setFocusGauge(0);
    setMistakes(0);
    setIsExitOpen(false);
    beginRound(1);
  }

  useEffect(() => {
    if (phase !== "playing") return undefined;
    function animate(now) {
      setNeedlePosition(getNeedlePosition(now - roundStartRef.current, roundConfig.durationMs));
      frameRef.current = window.requestAnimationFrame(animate);
    }
    frameRef.current = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [phase, roundConfig.durationMs]);

  useEffect(() => () => {
    window.cancelAnimationFrame(frameRef.current);
    window.clearTimeout(feedbackTimerRef.current);
  }, []);

  function completeGame(finalScore) {
    playSound("clear");
    setPhase("completed");
    setBest((currentBest) => {
      const nextBest = Math.max(currentBest, finalScore);
      if (nextBest !== currentBest) saveBestScore(nextBest);
      return nextBest;
    });
  }

  function tapNow() {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "feedback";
    window.cancelAnimationFrame(frameRef.current);
    const judged = judgeTiming(needlePosition, roundConfig.targetCenter, roundConfig.targetWidth);
    const scored = scoreTimingResult(judged, perfectComboRef.current);
    const nextScore = scoreRef.current + scored.points;
    const nextFocusGauge = judged.grade === "MISS"
      ? focusGaugeRef.current
      : Math.min(100, focusGaugeRef.current + 20);
    scoreRef.current = nextScore;
    perfectComboRef.current = scored.combo;
    focusGaugeRef.current = nextFocusGauge;
    setScore(nextScore);
    setPerfectCombo(scored.combo);
    setFocusGauge(nextFocusGauge);
    if (judged.grade === "MISS") setMistakes((current) => current + 1);
    setResult(scored);
    playSound(judged.grade === "MISS" ? "wrong" : judged.grade === "PERFECT" ? "success" : "correct");
    setPhase("feedback");
    vibrate(judged.grade === "PERFECT" ? 24 : judged.grade === "MISS" ? 8 : 14);
    feedbackTimerRef.current = window.setTimeout(() => {
      if (roundRef.current >= TIMING_TAP_ROUNDS) {
        completeGame(nextScore);
      } else {
        beginRound(roundRef.current + 1);
      }
    }, 760);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.key === " " || event.key === "Enter") && phaseRef.current === "playing") {
        event.preventDefault();
        tapNow();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function requestExit() {
    if (phase === "idle" || phase === "completed") {
      navigate("/");
      return;
    }
    setIsExitOpen(true);
  }

  const average = round > 1 || phase === "completed"
    ? Math.round(score / (phase === "completed" ? TIMING_TAP_ROUNDS : Math.max(1, round - (phase === "playing" ? 1 : 0))))
    : 0;
  const starRating = getStarRating(score / TIMING_TAP_MAX_SCORE, {
    mistakes,
    maxMistakesForThree: 1,
    twoStarThreshold: 0.42,
    threeStarThreshold: 0.76,
  });

  const sidebar = (
      <div className="stat-row">
      <div className="stat"><div className="l">Round</div><div className="v">{Math.min(round, TIMING_TAP_ROUNDS)}/{TIMING_TAP_ROUNDS}</div></div>
      <div className="stat"><div className="l">Score</div><div className="v">{score}</div></div>
      <div className="stat"><div className="l">Combo</div><div className="v">×{Math.max(1, perfectCombo)}</div></div>
      <div className="stat"><div className="l">Focus</div><div className="v">{focusGauge}%</div></div>
    </div>
  );

  return (
    <GameStage
      actions={<Button variant="secondary" onClick={requestExit}>게임 나가기</Button>}
      ariaLabel="타이밍 탭 게임"
      className="timing-tap"
      description={game.description}
      eyebrow="REACTION / TIMING"
      isExitConfirmationOpen={isExitOpen}
      onRequestExit={requestExit}
      sidebar={sidebar}
      title={game.title}
    >
      <div className="timing-tap__game">
        <div className="timing-tap__round-copy">
          <span>{phase === "idle" ? "READY" : roundConfig.focusAssisted ? `ROUND ${Math.min(round, TIMING_TAP_ROUNDS)} · FOCUS` : `ROUND ${Math.min(round, TIMING_TAP_ROUNDS)}`}</span>
          <strong>{result?.grade ?? (phase === "completed" ? "COMPLETE" : "목표 구간에 맞춰 탭!")}</strong>
        </div>

        <div className={`timing-tap__track ${result ? `is-${result.grade.toLowerCase()}` : ""}`} aria-label="타이밍 게이지">
          <span
            className="timing-tap__target"
            style={{
              left: `${roundConfig.targetCenter - roundConfig.targetWidth / 2}%`,
              width: `${roundConfig.targetWidth}%`,
            }}
          />
          <span className="timing-tap__needle" style={{ left: `${needlePosition}%` }} />
          <span className="timing-tap__track-line" />
        </div>

        {phase === "playing" ? (
          <button className="timing-tap__tap-button" type="button" onPointerDown={tapNow}>
            <span>TAP</span>
            <small>Space · Enter</small>
          </button>
        ) : null}
        {phase === "feedback" ? (
          <div className="timing-tap__feedback" aria-live="polite">
            <strong>+{result.points}</strong>
            <span>{result.grade === "PERFECT" ? `PERFECT 콤보 ×${result.multiplier}` : result.grade === "MISS" ? "콤보가 초기화됐어요" : "좋아요!"}</span>
          </div>
        ) : null}
        {phase === "completed" ? (
          <div className="timing-tap__complete">
            <strong>{score}점</strong>
            <span>{formatStarRating(starRating)} · 10라운드 평균 {average}점 · 최고 {Math.max(best, score)}점</span>
            <Button onClick={startGame}>다시 도전</Button>
          </div>
        ) : null}
      </div>

      {phase === "idle" ? (
        <GameStageOverlay state="start">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="timing-start-title">
            <GameStageDoodle variant="start" />
            <div className="game-stage-modal__eyebrow">REACTION / TIMING</div>
            <h3 id="timing-start-title">목표 구간에 맞춰 탭!</h3>
            <p>움직이는 바늘이 목표 구간에 들어왔을 때 탭하세요.</p>
            <Button onClick={startGame}>게임 시작</Button>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {isExitOpen ? (
        <GameStageOverlay state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="timing-exit-title">
            <div className="game-stage-modal__eyebrow">LEAVE GAME</div>
            <h3 id="timing-exit-title">타이밍 도전을 나갈까요?</h3>
            <p>현재 라운드 기록은 저장되지 않아요.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={() => navigate("/")}>나가기</Button>
              <Button variant="secondary" onClick={() => setIsExitOpen(false)}>계속하기</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
