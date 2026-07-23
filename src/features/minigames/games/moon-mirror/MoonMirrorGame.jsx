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
import { createMoonMirrorPuzzle, isMoonMirrorSolved, isMoonMirrorSourceCell } from "./moonMirror.logic.js";
import "./moon-mirror.css";

const AXIS_LABELS = { vertical: "세로 대칭", horizontal: "가로 대칭", diagonal: "대각선 대칭" };

export function MoonMirrorGame({ game }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const clearTimerRef = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [difficulty, setDifficulty] = useState("easy");
  const [round, setRound] = useState(1);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isExitOpen, setIsExitOpen] = useState(false);
  const puzzle = useMemo(() => createMoonMirrorPuzzle(difficulty, round), [difficulty, round]);
  const sourceActive = useMemo(() => new Set(puzzle.sourceActive), [puzzle]);
  const { elapsedMs, resetTimer } = useActiveGameTimer(phase === "playing" && !isExitOpen);
  const time = formatActiveGameTime(elapsedMs);

  useEffect(() => () => window.clearTimeout(clearTimerRef.current), []);

  function beginRound(nextDifficulty, nextRound, { resetTime = false } = {}) {
    window.clearTimeout(clearTimerRef.current);
    setDifficulty(nextDifficulty);
    setRound(nextRound);
    setSelectedCells(new Set());
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
    if (phase !== "playing" || isMoonMirrorSourceCell(index, puzzle.size, puzzle.axis)) return;
    setFeedback("");
    setSelectedCells((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    playSound("correct");
  }

  function checkPattern() {
    if (!isMoonMirrorSolved(selectedCells, puzzle.targetActive)) {
      setMistakes((current) => current + 1);
      setFeedback("대칭축을 기준으로 한 번 더 살펴보세요.");
      playSound("wrong");
      return;
    }

    setFeedback("달빛 무늬 완성!");
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
      ariaLabel="달빛 거울 게임"
      className="moon-mirror"
      description={game.description}
      eyebrow="PUZZLE / SYMMETRY"
      isExitConfirmationOpen={isExitOpen}
      onRequestExit={requestExit}
      sidebar={<EndlessGameSidebar difficulty={difficulty} mistakes={mistakes} round={round} time={time} />}
      title={game.title}
    >
      <div className="moon-mirror__game">
        <div className="endless-game-status" aria-live="polite">
          <span>{ENDLESS_DIFFICULTY_LABELS[difficulty]} · {AXIS_LABELS[puzzle.axis]} · {getEndlessRoundProgress(round).blockRound}/10</span>
          <strong>{feedback || "반대편 달빛 무늬를 완성하세요"}</strong>
        </div>
        <div
          className="moon-mirror__board"
          data-axis={puzzle.axis}
          role="grid"
          style={{ "--mirror-size": puzzle.size }}
          aria-label={`${puzzle.size} 곱하기 ${puzzle.size} 대칭 퍼즐`}
        >
          {Array.from({ length: puzzle.size * puzzle.size }, (_, index) => {
            const isSource = isMoonMirrorSourceCell(index, puzzle.size, puzzle.axis);
            const isFilled = isSource ? sourceActive.has(index) : selectedCells.has(index);
            return (
              <button
                aria-label={`${Math.floor(index / puzzle.size) + 1}행 ${index % puzzle.size + 1}열${isSource ? " 원본" : " 입력"}`}
                aria-pressed={isFilled}
                className={`moon-mirror__cell${isSource ? " is-source" : " is-target"}${isFilled ? " is-filled" : ""}`}
                disabled={isSource || phase !== "playing"}
                key={index}
                onClick={() => toggleCell(index)}
                type="button"
              />
            );
          })}
          <span className="moon-mirror__axis" aria-hidden="true" />
        </div>
        <Button disabled={phase !== "playing"} onClick={checkPattern}>완성 확인</Button>
      </div>

      {phase === "idle" ? (
        <GameStageOverlay state="start">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="moon-mirror-start-title">
            <GameStageDoodle variant="start" />
            <div className="game-stage-modal__eyebrow">PUZZLE / SYMMETRY</div>
            <h3 id="moon-mirror-start-title">달빛 거울을 맞춰보세요</h3>
            <p>보이는 무늬를 대칭축 반대편에 그대로 비춰 완성하세요.</p>
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
