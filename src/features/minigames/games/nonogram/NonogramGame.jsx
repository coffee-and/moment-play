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
import { createNonogramPuzzle, isNonogramSolved } from "./nonogram.logic.js";
import "./nonogram.css";

export function NonogramGame({ game }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const clearTimerRef = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [difficulty, setDifficulty] = useState("easy");
  const [round, setRound] = useState(1);
  const [cellStates, setCellStates] = useState([]);
  const [tool, setTool] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isExitOpen, setIsExitOpen] = useState(false);
  const puzzle = useMemo(() => createNonogramPuzzle(difficulty, round), [difficulty, round]);
  const { elapsedMs, resetTimer } = useActiveGameTimer(phase === "playing" && !isExitOpen);
  const time = formatActiveGameTime(elapsedMs);

  useEffect(() => () => window.clearTimeout(clearTimerRef.current), []);

  function beginRound(nextDifficulty, nextRound, { resetTime = false } = {}) {
    window.clearTimeout(clearTimerRef.current);
    setDifficulty(nextDifficulty);
    setRound(nextRound);
    const size = createNonogramPuzzle(nextDifficulty, nextRound).size;
    setCellStates(Array(size * size).fill(0));
    setTool(1);
    setFeedback("");
    setPhase("playing");
    setIsExitOpen(false);
    if (resetTime) resetTimer();
  }

  function startGame() {
    setMistakes(0);
    beginRound("easy", 1, { resetTime: true });
  }

  function toggleCell(index) {
    if (phase !== "playing") return;
    setFeedback("");
    setCellStates((current) => current.map((state, cellIndex) => (
      cellIndex === index ? (state === tool ? 0 : tool) : state
    )));
    playSound("correct");
  }

  function checkPuzzle() {
    if (!isNonogramSolved(cellStates, puzzle.clues, puzzle.size)) {
      setMistakes((current) => current + 1);
      setFeedback("가로와 세로 숫자를 다시 확인해보세요.");
      playSound("wrong");
      return;
    }

    setFeedback("그림 완성!");
    setPhase("round-clear");
    playSound("success");
    clearTimerRef.current = window.setTimeout(() => {
      if (getEndlessRoundProgress(round).isBlockEnd) setPhase("block-clear");
      else beginRound(difficulty, round + 1);
    }, 650);
  }

  function requestExit() {
    if (phase === "idle") navigate("/");
    else setIsExitOpen(true);
  }

  return (
    <GameStage
      actions={<Button variant="secondary" onClick={requestExit}>게임 나가기</Button>}
      ariaLabel="노노그램 게임"
      className="nonogram"
      description={game.description}
      eyebrow="PUZZLE / LOGIC"
      isExitConfirmationOpen={isExitOpen}
      onRequestExit={requestExit}
      sidebar={<EndlessGameSidebar difficulty={difficulty} mistakes={mistakes} round={round} time={time} />}
      title={game.title}
    >
      <div className="nonogram__game">
        <div className="endless-game-status" aria-live="polite">
          <span>{ENDLESS_DIFFICULTY_LABELS[difficulty]} · {puzzle.size}×{puzzle.size} · {getEndlessRoundProgress(round).blockRound}/10</span>
          <strong>{feedback || "숫자 힌트로 그림을 완성하세요"}</strong>
        </div>

        <div className="nonogram__puzzle" style={{ "--nonogram-size": puzzle.size }}>
          <div className="nonogram__corner" aria-hidden="true" />
          <div className="nonogram__column-clues" aria-label="세로 힌트">
            {puzzle.clues.columns.map((clue, index) => <span key={index}>{clue.map((value, clueIndex) => <b key={clueIndex}>{value}</b>)}</span>)}
          </div>
          <div className="nonogram__row-clues" aria-label="가로 힌트">
            {puzzle.clues.rows.map((clue, index) => <span key={index}>{clue.map((value, clueIndex) => <b key={clueIndex}>{value}</b>)}</span>)}
          </div>
          <div className="nonogram__board" role="grid" aria-label={`${puzzle.size} 곱하기 ${puzzle.size} 노노그램 보드`}>
            {Array.from({ length: puzzle.size * puzzle.size }, (_, index) => (
              <button
                aria-label={`${Math.floor(index / puzzle.size) + 1}행 ${index % puzzle.size + 1}열`}
                aria-pressed={cellStates[index] === 1}
                className={`nonogram__cell${cellStates[index] === 1 ? " is-filled" : cellStates[index] === 2 ? " is-marked" : ""}`}
                key={index}
                onClick={() => toggleCell(index)}
                type="button"
              />
            ))}
          </div>
        </div>

        <div className="nonogram__controls">
          <div className="nonogram__tools" role="group" aria-label="칸 입력 방식">
            <Button aria-pressed={tool === 1} variant={tool === 1 ? "primary" : "secondary"} onClick={() => setTool(1)}>채우기</Button>
            <Button aria-pressed={tool === 2} variant={tool === 2 ? "primary" : "secondary"} onClick={() => setTool(2)}>× 표시</Button>
          </div>
          <Button onClick={checkPuzzle}>완성 확인</Button>
        </div>
      </div>

      {phase === "idle" ? (
        <GameStageOverlay state="start">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="nonogram-start-title">
            <GameStageDoodle variant="start" />
            <div className="game-stage-modal__eyebrow">PUZZLE / LOGIC</div>
            <h3 id="nonogram-start-title">숫자 속 그림을 찾아보세요</h3>
            <p>가로와 세로의 연속된 칸 수를 보고 숨은 그림을 완성하세요.</p>
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
