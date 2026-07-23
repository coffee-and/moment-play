import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { EndlessBlockModal } from "../../shared/components/EndlessBlockModal.jsx";
import { EndlessGameExitModal } from "../../shared/components/EndlessGameExitModal.jsx";
import { EndlessGameSidebar } from "../../shared/components/EndlessGameSidebar.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import { ENDLESS_DIFFICULTY_LABELS, getEndlessRoundProgress, getNextEndlessDifficulty } from "../../shared/gameProgression.js";
import { formatActiveGameTime, useActiveGameTimer } from "../../shared/hooks/useActiveGameTimer.js";
import { createStarTracePuzzle, evaluateStarTraceChoice } from "./starTrace.logic.js";
import "./star-trace.css";

export function StarTraceGame({ game }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const clearTimerRef = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [difficulty, setDifficulty] = useState("easy");
  const [round, setRound] = useState(1);
  const [nextStar, setNextStar] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [isTracing, setIsTracing] = useState(false);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const puzzle = useMemo(() => createStarTracePuzzle(difficulty, round), [difficulty, round]);
  const { elapsedMs, resetTimer } = useActiveGameTimer(phase === "playing" && !isExitOpen);
  const time = formatActiveGameTime(elapsedMs);

  useEffect(() => () => window.clearTimeout(clearTimerRef.current), []);
  useEffect(() => {
    const stopTracing = () => setIsTracing(false);
    window.addEventListener("pointerup", stopTracing);
    return () => window.removeEventListener("pointerup", stopTracing);
  }, []);

  function beginRound(nextDifficulty, nextRound, { resetTime = false } = {}) {
    window.clearTimeout(clearTimerRef.current);
    setDifficulty(nextDifficulty);
    setRound(nextRound);
    setNextStar(0);
    setPhase("playing");
    setIsExitOpen(false);
    if (resetTime) resetTimer();
  }

  function startGame() {
    setMistakes(0);
    beginRound("easy", 1, { resetTime: true });
  }

  function completeRound() {
    playSound("success");
    setPhase("round-clear");
    clearTimerRef.current = window.setTimeout(() => {
      if (getEndlessRoundProgress(round).isBlockEnd) setPhase("block-clear");
      else beginRound(difficulty, round + 1);
    }, 650);
  }

  function chooseStar(index) {
    if (phase !== "playing") return;
    const result = evaluateStarTraceChoice(nextStar, index, puzzle.points.length);
    if (!result.correct) {
      if (index < nextStar) return;
      setMistakes((current) => current + 1);
      playSound("wrong");
      return;
    }
    setNextStar(result.nextIndex);
    playSound("correct");
    if (result.complete) completeRound();
  }

  function requestExit() {
    if (phase === "idle") navigate("/");
    else setIsExitOpen(true);
  }

  const connectedPoints = puzzle.points.slice(0, nextStar).map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <GameStage
      actions={<Button variant="secondary" onClick={requestExit}>게임 나가기</Button>}
      ariaLabel="별자리 그리기 게임"
      className="star-trace"
      description={game.description}
      eyebrow="PUZZLE / TRACE"
      isExitConfirmationOpen={isExitOpen}
      onRequestExit={requestExit}
      sidebar={<EndlessGameSidebar difficulty={difficulty} mistakes={mistakes} round={round} time={time} />}
      title={game.title}
    >
      <div className="star-trace__game">
        <div className="endless-game-status" aria-live="polite">
          <span>{ENDLESS_DIFFICULTY_LABELS[difficulty]} · {getEndlessRoundProgress(round).blockRound}/10</span>
          <strong>{phase === "round-clear" ? "별자리 완성!" : `${nextStar + 1}번째 별을 이어주세요`}</strong>
        </div>
        <div className="star-trace__board" role="application" aria-label="별자리 그리기 보드">
          <svg aria-hidden="true" viewBox="0 0 100 100">
            {puzzle.showGuide ? <polyline className="star-trace__guide" points={puzzle.points.map((point) => `${point.x},${point.y}`).join(" ")} /> : null}
            {connectedPoints ? <polyline className="star-trace__line" points={connectedPoints} /> : null}
          </svg>
          {puzzle.points.map((point, index) => (
            <button
              aria-label={`${index + 1}번째 별`}
              className={`star-trace__star${index < nextStar ? " is-connected" : ""}${index === nextStar ? " is-next" : ""}`}
              key={`${round}-${index}`}
              onClick={() => chooseStar(index)}
              onPointerDown={() => { setIsTracing(true); chooseStar(index); }}
              onPointerEnter={() => { if (isTracing) chooseStar(index); }}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              type="button"
            >
              <span aria-hidden="true">{index + 1}</span>
            </button>
          ))}
        </div>
        <p className="endless-game-hint">첫 별부터 손가락으로 이어도 되고, 순서대로 가볍게 눌러도 돼요.</p>
      </div>

      {phase === "idle" ? (
        <GameStageOverlay state="start">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="star-trace-start-title">
            <GameStageDoodle variant="start" />
            <div className="game-stage-modal__eyebrow">PUZZLE / TRACE</div>
            <h3 id="star-trace-start-title">달빛 별자리를 이어보세요</h3>
            <p>별에 적힌 순서대로 선을 이어 하나의 별자리를 완성하세요.</p>
            <Button onClick={startGame}>게임 시작</Button>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === "block-clear" ? (
        <EndlessBlockModal
          difficulty={difficulty}
          mistakes={mistakes}
          onAdvance={() => beginRound(getNextEndlessDifficulty(difficulty), 1, { resetTime: true })}
          onContinue={() => beginRound(difficulty, round + 1)}
          round={round}
          time={time}
        />
      ) : null}

      {isExitOpen ? <EndlessGameExitModal onCancel={() => setIsExitOpen(false)} onExit={() => navigate("/")} /> : null}
    </GameStage>
  );
}
