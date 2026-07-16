import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../../shared/components/Button.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import "./timing-tap.css";
import {
  TIMING_TAP_ROUNDS,
  getNeedlePosition,
  getTimingRoundConfig,
  judgeTiming,
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
  const [phase, setPhase] = useState("idle");
  const [round, setRound] = useState(1);
  const [roundConfig, setRoundConfig] = useState(() => getTimingRoundConfig(1));
  const [needlePosition, setNeedlePosition] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBestScore);
  const [result, setResult] = useState(null);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const frameRef = useRef(null);
  const roundStartRef = useRef(0);
  const feedbackTimerRef = useRef(null);
  const phaseRef = useRef(phase);
  const roundRef = useRef(round);

  phaseRef.current = phase;
  roundRef.current = round;

  function beginRound(nextRound) {
    const config = getTimingRoundConfig(nextRound);
    setRound(nextRound);
    setRoundConfig(config);
    setNeedlePosition(0);
    setResult(null);
    roundStartRef.current = performance.now();
    setPhase("playing");
  }

  function startGame() {
    window.clearTimeout(feedbackTimerRef.current);
    setScore(0);
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
    setPhase("completed");
    setBest((currentBest) => {
      const nextBest = Math.max(currentBest, finalScore);
      if (nextBest !== currentBest) saveBestScore(nextBest);
      return nextBest;
    });
  }

  function tapNow() {
    if (phaseRef.current !== "playing") return;
    window.cancelAnimationFrame(frameRef.current);
    const judged = judgeTiming(needlePosition, roundConfig.targetCenter, roundConfig.targetWidth);
    const nextScore = score + judged.score;
    setScore(nextScore);
    setResult(judged);
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

  const sidebar = (
    <div className="stat-row">
      <div className="stat"><div className="l">Round</div><div className="v">{Math.min(round, TIMING_TAP_ROUNDS)}/{TIMING_TAP_ROUNDS}</div></div>
      <div className="stat"><div className="l">Score</div><div className="v">{score}</div></div>
      <div className="stat"><div className="l">Best</div><div className="v">{best}</div></div>
      <div className="stat"><div className="l">Average</div><div className="v">{average}</div></div>
    </div>
  );

  return (
    <GameStage
      actions={<Button variant="secondary" onClick={requestExit}>게임 나가기</Button>}
      ariaLabel="타이밍 탭 게임"
      className="timing-tap"
      description={game.description}
      eyebrow="REACTION / TIMING"
      sidebar={sidebar}
      title={game.title}
    >
      <div className="timing-tap__game">
        <div className="timing-tap__round-copy">
          <span>{phase === "idle" ? "READY" : `ROUND ${Math.min(round, TIMING_TAP_ROUNDS)}`}</span>
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

        {phase === "idle" ? (
          <Button className="timing-tap__main-button" onClick={startGame}>게임 시작</Button>
        ) : null}
        {phase === "playing" ? (
          <button className="timing-tap__tap-button" type="button" onPointerDown={tapNow}>
            <span>TAP</span>
            <small>Space · Enter</small>
          </button>
        ) : null}
        {phase === "feedback" ? (
          <div className="timing-tap__feedback" aria-live="polite">
            <strong>+{result.score}</strong>
            <span>{result.grade === "PERFECT" ? "정확해요!" : result.grade === "MISS" ? "조금만 더 집중!" : "좋아요!"}</span>
          </div>
        ) : null}
        {phase === "completed" ? (
          <div className="timing-tap__complete">
            <strong>{score}점</strong>
            <span>5라운드 평균 {Math.round(score / TIMING_TAP_ROUNDS)}점</span>
            <Button onClick={startGame}>다시 도전</Button>
          </div>
        ) : null}
      </div>

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
