import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { GameActionFeedback } from "../../shared/components/GameActionFeedback.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameRecordCelebration } from "../../shared/components/GameRecordCelebration.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import { isNewGameRecord } from "../../shared/gameRecord.js";
import { formatStarRating, getStarRating } from "../../shared/gameProgression.js";
import {
  FLAPPY_CONFIG,
  advanceFlappyState,
  createInitialFlappyState,
  flapFlappyState,
  recoverFlappyState,
} from "./flappy.logic.js";
import "./flappy-game.css";

const FLAPPY_BEST_KEY = "eunContents.flappy.best";

const FLAPPY_STAR_FIELD = [
  [8, 13, 4, "warm"], [18, 30, 3, "cool"], [29, 17, 5, "cool"],
  [42, 34, 3, "warm"], [56, 15, 4, "cool"], [70, 29, 3, "warm"],
  [80, 24, 5, "cool"], [92, 39, 3, "cool"], [12, 55, 3, "warm"],
  [25, 69, 4, "cool"], [39, 51, 3, "cool"], [53, 78, 5, "warm"],
  [66, 60, 3, "cool"], [79, 73, 4, "cool"], [91, 57, 3, "warm"],
  [17, 88, 4, "cool"], [35, 91, 3, "warm"], [72, 92, 3, "cool"],
];

function readBestScore() {
  try {
    const score = Number(window.localStorage.getItem(FLAPPY_BEST_KEY));
    return Number.isFinite(score) ? Math.max(0, score) : 0;
  } catch {
    return 0;
  }
}

function writeBestScore(score) {
  try {
    window.localStorage.setItem(FLAPPY_BEST_KEY, String(score));
  } catch {
    return;
  }
}

function vibrate(pattern) {
  globalThis.navigator?.vibrate?.(pattern);
}

export function FlappyGame({ game }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const [phase, setPhase] = useState("idle");
  const [world, setWorld] = useState(createInitialFlappyState);
  const [best, setBest] = useState(readBestScore);
  const [didBreakRecordThisAttempt, setDidBreakRecordThisAttempt] = useState(false);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const phaseRef = useRef(phase);
  const worldRef = useRef(world);
  const bestRef = useRef(best);
  const frameRef = useRef(null);
  const lastFrameRef = useRef(0);
  const resumeAfterDialogRef = useRef(false);
  const feedbackSequenceRef = useRef(0);
  const feedbackTimerRef = useRef(null);

  phaseRef.current = phase;
  worldRef.current = world;
  bestRef.current = best;

  function showFlightFeedback(feedback) {
    window.clearTimeout(feedbackTimerRef.current);
    feedbackSequenceRef.current += 1;
    const durationMs = feedback.durationMs ?? 880;
    setActionFeedback({ ...feedback, durationMs, id: feedbackSequenceRef.current });
    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null;
      setActionFeedback(null);
    }, durationMs + 30);
  }

  function finishGame(finalWorld) {
    phaseRef.current = "over";
    setWorld(finalWorld);
    setPhase("over");
    playSound("gameOver");
    vibrate([28, 34, 42]);
    const didBreakRecord = isNewGameRecord({ previous: bestRef.current, next: finalWorld.score });
    setDidBreakRecordThisAttempt(didBreakRecord);
    if (didBreakRecord) {
      bestRef.current = finalWorld.score;
      setBest(finalWorld.score);
      writeBestScore(finalWorld.score);
    }
  }

  useEffect(() => {
    if (phase !== "playing") return undefined;

    lastFrameRef.current = performance.now();
    function animate(now) {
      const deltaSeconds = (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;
      const result = advanceFlappyState(worldRef.current, deltaSeconds);
      worldRef.current = result.state;
      setWorld(result.state);

      if (result.scored > 0) {
        playSound("correct");
        vibrate(12);
        const nextCombo = result.state.combo;
        if (nextCombo === 5) {
          showFlightFeedback({
            comboLabel: "COMBO ×5",
            durationMs: 1180,
            label: "GREAT FLIGHT!",
            variant: "major",
          });
        } else if (nextCombo === 10 || (nextCombo > 10 && nextCombo % 5 === 0)) {
          showFlightFeedback({
            durationMs: 1220,
            label: `COMBO ×${nextCombo}`,
            showStars: true,
            variant: "major",
          });
        } else if (nextCombo === 3) {
          showFlightFeedback({
            durationMs: 1020,
            label: "COMBO ×3",
            showStars: true,
            variant: "combo",
          });
        } else {
          showFlightFeedback({
            durationMs: 780,
            label: `+${result.scoreGain}`,
            showStars: false,
            variant: "compact",
          });
        }
      }

      if (result.status === "collision") {
        const recovery = recoverFlappyState(result.state);
        worldRef.current = recovery.state;
        setWorld(recovery.state);
        if (recovery.status === "over") {
          finishGame(recovery.state);
          return;
        }
        showFlightFeedback({
          durationMs: 880,
          label: recovery.status === "shield" ? "SHIELD SAVE!" : "LIFE -1",
          showStars: recovery.status === "shield",
          tone: recovery.status === "shield" ? "neutral" : "negative",
          variant: "standard",
        });
        playSound(recovery.status === "shield" ? "success" : "wrong");
        vibrate(recovery.status === "shield" ? [10, 20, 10] : [24, 30, 24]);
      }

      frameRef.current = window.requestAnimationFrame(animate);
    }

    frameRef.current = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [phase, playSound]);

  useEffect(() => () => {
    window.cancelAnimationFrame(frameRef.current);
    window.clearTimeout(feedbackTimerRef.current);
  }, []);

  function startGame() {
    const initialWorld = flapFlappyState(createInitialFlappyState());
    worldRef.current = initialWorld;
    phaseRef.current = "playing";
    setWorld(initialWorld);
    setDidBreakRecordThisAttempt(false);
    setIsExitOpen(false);
    setActionFeedback(null);
    window.clearTimeout(feedbackTimerRef.current);
    setPhase("playing");
    playSound("countdownFinal");
    vibrate(8);
  }

  function flap() {
    if (phaseRef.current !== "playing") return;
    const nextWorld = flapFlappyState(worldRef.current);
    worldRef.current = nextWorld;
    setWorld(nextWorld);
    playSound("tap");
    vibrate(7);
  }

  function pauseGame() {
    phaseRef.current = "paused";
    setPhase("paused");
  }

  function resumeGame() {
    phaseRef.current = "playing";
    setPhase("playing");
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      if (phaseRef.current === "playing") {
        flap();
      } else if (phaseRef.current === "paused") {
        resumeGame();
      } else {
        startGame();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function requestExit() {
    if (phase === "idle" || phase === "over") {
      navigate("/");
      return;
    }
    resumeAfterDialogRef.current = phase === "playing";
    if (phase === "playing") pauseGame();
    setIsExitOpen(true);
  }

  function closeExitDialog() {
    setIsExitOpen(false);
    if (resumeAfterDialogRef.current) resumeGame();
    resumeAfterDialogRef.current = false;
  }

  const sidebar = (
    <div className="stat-row">
      <div className="stat"><div className="l">Score</div><div className="v">{world.score}</div></div>
      <div className="stat"><div className="l">Combo</div><div className="v">×{world.combo}</div></div>
      <div className="stat"><div className="l">Lives</div><div className="v">{world.lives}</div></div>
      <div className="stat"><div className="l">Shield</div><div className="v">{world.shieldReady ? "READY" : `${world.shieldGauge}%`}</div></div>
    </div>
  );

  const actions = (
    <div className="game-stage__inline-actions">
      {phase === "playing" ? <Button variant="secondary" onClick={pauseGame}>일시정지</Button> : null}
      {phase === "paused" ? <Button variant="secondary" onClick={resumeGame}>계속하기</Button> : null}
      <Button variant="secondary" onClick={requestExit}>게임 나가기</Button>
    </div>
  );

  return (
    <GameStage
      actions={actions}
      ariaLabel="별빛 비행 게임"
      className="flappy-game"
      description={game.description}
      eyebrow="ARCADE / FLIGHT"
      isExitConfirmationOpen={isExitOpen}
      onRequestExit={requestExit}
      sidebar={sidebar}
      title={game.title}
    >
      <div className="flappy-game__wrap">
        <div
          className="flappy-game__sky"
          role="application"
          tabIndex={0}
          aria-label={`별빛 비행, 현재 점수 ${world.score}. 화면이나 Space·Enter를 눌러 날아오르세요.`}
          onPointerDown={(event) => {
            if (event.button != null && event.button !== 0) return;
            if (event.target.closest("button")) return;
            event.preventDefault();
            flap();
          }}
        >
          <svg className="flappy-game__moon" aria-hidden="true" viewBox="0 0 64 64">
            <path d="M41 5C25 7 15 20 16 34c1 17 15 29 31 26 6-1 11-4 15-9-10 5-23 1-29-9-7-12-3-28 8-37Z" />
          </svg>
          <span className="flappy-game__stars" aria-hidden="true">
            {FLAPPY_STAR_FIELD.map(([left, top, size, tone], index) => (
              <i
                className={`flappy-game__star is-${tone}`}
                key={`${left}-${top}`}
                style={{ left: `${left}%`, top: `${top}%`, "--star-size": `${size}px`, "--star-delay": `${(index % 6) * -0.35}s` }}
              />
            ))}
          </span>
          <span className="flappy-game__score" aria-hidden="true">{world.score}</span>
          <GameActionFeedback feedback={actionFeedback} announce={false} />

          {world.pipes.map((pipe) => {
            const gapTop = pipe.gapY - FLAPPY_CONFIG.gapHeight / 2;
            const gapBottom = pipe.gapY + FLAPPY_CONFIG.gapHeight / 2;
            return (
              <span
                className="flappy-game__gate"
                key={pipe.id}
                style={{ left: `${pipe.x}%`, width: `${FLAPPY_CONFIG.pipeWidth}%` }}
                aria-hidden="true"
              >
                <i className="flappy-game__pillar is-top" style={{ height: `${gapTop}%` }} />
                <i className="flappy-game__pillar is-bottom" style={{ top: `${gapBottom}%` }} />
              </span>
            );
          })}

          <span
            className={`flappy-game__bird${world.recoveryKind ? ` is-recovering is-${world.recoveryKind}` : ""}`}
            style={{
              left: `${FLAPPY_CONFIG.birdX}%`,
              top: `${world.birdY}%`,
              "--bird-tilt": `${Math.max(-24, Math.min(48, world.velocity * 2.2))}deg`,
            }}
            aria-hidden="true"
          >
            <i className="flappy-game__bird-core" />
            <i className="flappy-game__bird-wing" />
            <i className="flappy-game__bird-tail" />
          </span>

          {phase !== "playing" && phase !== "idle" ? (
            <div className="flappy-game__curtain">
              <GameRecordCelebration compact isNewRecord={phase === "over" && didBreakRecordThisAttempt} />
              <span className="flappy-game__curtain-kicker">
                {phase === "paused" ? "PAUSED" : phase === "over" ? "FLIGHT ENDED" : "READY TO FLY"}
              </span>
              <strong>
                {phase === "over"
                  ? `${formatStarRating(getStarRating(Math.min(1, world.score / 1000), { mistakes: FLAPPY_CONFIG.initialLives - world.lives, maxMistakesForThree: 1 }))} ${world.score}점`
                  : phase === "paused" ? "잠시 쉬어갈까요?" : "별빛 사이를 날아보세요"}
              </strong>
              <p>
                {phase === "over"
                  ? `최고 기록 ${Math.max(best, world.score)}점`
                  : "화면을 탭하거나 Space·Enter를 눌러 날개를 펼쳐요."}
              </p>
              <Button onClick={phase === "paused" ? resumeGame : startGame}>
                {phase === "paused" ? "계속하기" : phase === "over" ? "다시 비행" : "비행 시작"}
              </Button>
            </div>
          ) : null}
        </div>
        <p className="flappy-game__hint">탭할 때마다 위로 날아요 · 기둥과 천장·바닥을 피하세요</p>
      </div>

      {phase === "idle" ? (
        <GameStageOverlay state="start">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="flappy-start-title">
            <GameStageDoodle variant="start" />
            <div className="game-stage-modal__eyebrow">ARCADE / FLIGHT</div>
            <h3 id="flappy-start-title">별빛 사이를 날아보세요</h3>
            <p>화면을 탭하거나 Space·Enter를 눌러 날개를 펼쳐요.</p>
            <Button onClick={startGame}>비행 시작</Button>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {isExitOpen ? (
        <GameStageOverlay state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="flappy-exit-title">
            <div className="game-stage-modal__eyebrow">LEAVE FLIGHT</div>
            <h3 id="flappy-exit-title">비행을 종료할까요?</h3>
            <p>현재 점수는 최고 기록에 반영되지 않아요.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={() => navigate("/")}>나가기</Button>
              <Button variant="secondary" onClick={closeExitDialog}>계속 비행</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
