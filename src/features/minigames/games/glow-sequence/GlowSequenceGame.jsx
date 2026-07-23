import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameRecordCelebration } from "../../shared/components/GameRecordCelebration.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import { GAME_COLOR_PALETTE } from "../../shared/gameColorPalette.js";
import { isNewGameRecord } from "../../shared/gameRecord.js";
import {
  GLOW_SEQUENCE_MASTER_COUNT,
  GLOW_SEQUENCE_MAX_ROUND,
  createGlowSequence,
  evaluateGlowChoice,
  getGlowGridSize,
  getGlowPlaybackTiming,
  getGlowSequenceLength,
} from "./glowSequence.logic.js";
import "./glow-sequence.css";

const BEST_ROUND_KEY = "eunContents.glowSequence.bestRound";
const CELL_COLORS = GAME_COLOR_PALETTE.map((color) => color.value);

function readBestRound() {
  try {
    const value = Number(window.localStorage.getItem(BEST_ROUND_KEY));
    return Number.isFinite(value) ? Math.min(GLOW_SEQUENCE_MAX_ROUND, Math.max(0, Math.floor(value))) : 0;
  } catch {
    return 0;
  }
}

function saveBestRound(round) {
  try {
    window.localStorage.setItem(BEST_ROUND_KEY, String(round));
  } catch {
    // Local progress is optional.
  }
}

export function GlowSequenceGame({ game }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const timersRef = useRef([]);
  const phaseRef = useRef("idle");
  const sequenceRef = useRef([]);
  const inputStepRef = useRef(0);
  const [phase, setPhase] = useState("idle");
  const [round, setRound] = useState(1);
  const [sequence, setSequence] = useState([]);
  const [activeCell, setActiveCell] = useState(null);
  const [inputStep, setInputStep] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [bestRound, setBestRound] = useState(readBestRound);
  const [didBreakRecordThisAttempt, setDidBreakRecordThisAttempt] = useState(false);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const bestRoundRef = useRef(bestRound);

  const sequenceLength = getGlowSequenceLength(round);
  const gridSize = getGlowGridSize(sequenceLength);
  const cellCount = gridSize * gridSize;
  const cells = useMemo(() => Array.from({ length: cellCount }, (_, index) => index), [cellCount]);

  phaseRef.current = phase;
  sequenceRef.current = sequence;
  inputStepRef.current = inputStep;
  bestRoundRef.current = bestRound;

  function clearTimers() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }

  useEffect(() => clearTimers, []);

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  }

  function showSequence(nextSequence) {
    clearTimers();
    const timing = getGlowPlaybackTiming(nextSequence.length);
    setInputStep(0);
    inputStepRef.current = 0;
    setActiveCell(null);
    setPhase("showing");
    phaseRef.current = "showing";

    nextSequence.forEach((cell, index) => {
      const startAt = timing.leadMs + index * (timing.onMs + timing.gapMs);
      schedule(() => {
        setActiveCell(cell);
        playSound("correct", { feedback: false });
      }, startAt);
      schedule(() => setActiveCell(null), startAt + timing.onMs);
    });

    const total = timing.leadMs + nextSequence.length * (timing.onMs + timing.gapMs);
    schedule(() => {
      setActiveCell(null);
      setPhase("input");
      phaseRef.current = "input";
    }, total);
  }

  function beginRound(nextRound, { reuseSequence = false } = {}) {
    const length = getGlowSequenceLength(nextRound);
    const size = getGlowGridSize(length);
    const nextSequence = reuseSequence
      ? sequenceRef.current
      : createGlowSequence(size, length);
    setRound(nextRound);
    setSequence(nextSequence);
    sequenceRef.current = nextSequence;
    showSequence(nextSequence);
  }

  function startGame() {
    clearTimers();
    setMistakes(0);
    setDidBreakRecordThisAttempt(false);
    setIsExitOpen(false);
    beginRound(1);
  }

  function updateBest(completedRound) {
    if (!isNewGameRecord({ previous: bestRoundRef.current, next: completedRound })) return;
    bestRoundRef.current = completedRound;
    setBestRound(completedRound);
    setDidBreakRecordThisAttempt(true);
    saveBestRound(completedRound);
  }

  function handleCellClick(cell) {
    if (phaseRef.current !== "input") return;
    const result = evaluateGlowChoice(sequenceRef.current, inputStepRef.current, cell);
    if (!result.correct) {
      playSound("wrong");
      setMistakes((current) => current + 1);
      setPhase("retry");
      phaseRef.current = "retry";
      schedule(() => showSequence(sequenceRef.current), 850);
      return;
    }

    setActiveCell(cell);
    schedule(() => setActiveCell(null), 190);
    setInputStep(result.nextStep);
    inputStepRef.current = result.nextStep;

    if (!result.complete) {
      playSound("correct", { feedback: false });
      return;
    }
    updateBest(round);
    if (round === GLOW_SEQUENCE_MAX_ROUND) {
      playSound("clear");
      setPhase("master");
      phaseRef.current = "master";
      return;
    }

    playSound("correct");
    setPhase("cleared");
    phaseRef.current = "cleared";
    schedule(() => beginRound(round + 1), 820);
  }

  function requestExit() {
    if (phase === "idle" || phase === "master") {
      navigate("/");
      return;
    }
    clearTimers();
    setPhase("paused");
    phaseRef.current = "paused";
    setIsExitOpen(true);
  }

  function continueGame() {
    setIsExitOpen(false);
    showSequence(sequenceRef.current);
  }

  const sidebar = (
    <div className="stat-row">
      <div className="stat"><div className="l">Round</div><div className="v">{round}/{GLOW_SEQUENCE_MAX_ROUND}</div></div>
      <div className="stat"><div className="l">Sequence</div><div className="v">{sequenceLength}</div></div>
      <div className="stat"><div className="l">Grid</div><div className="v">{gridSize}×{gridSize}</div></div>
      <div className="stat"><div className="l">Mistakes</div><div className="v">{mistakes}</div></div>
      <div className="game-stage__side-note">최고 기록 {bestRound ? `${bestRound}라운드` : "도전 전"}</div>
    </div>
  );

  const statusText = phase === "idle"
    ? "빛의 순서를 끝까지 이어보세요"
    : phase === "showing"
      ? "순서를 기억하세요"
      : phase === "retry"
        ? "한 번 더 보여드릴게요"
        : phase === "cleared"
          ? `ROUND ${round} CLEAR`
          : `${inputStep + 1}번째 칸을 선택하세요`;

  return (
    <GameStage
      actions={<Button variant="secondary" onClick={requestExit}>게임 나가기</Button>}
      ariaLabel="글로우 시퀀스 게임"
      className="glow-sequence"
      description={game.description}
      eyebrow="MEMORY / LIGHT"
      isExitConfirmationOpen={isExitOpen}
      onRequestExit={requestExit}
      sidebar={sidebar}
      title={game.title}
    >
      <div className="glow-sequence__game">
        <div className="glow-sequence__status" aria-live="polite">
          <span>ROUND {round} · {sequenceLength} CELLS</span>
          <strong>{statusText}</strong>
        </div>

        <div
          className="glow-sequence__grid"
          data-size={gridSize}
          role="grid"
          aria-label={`${gridSize} 곱하기 ${gridSize} 빛 순서 보드`}
        >
          {cells.map((cell) => (
            <button
              aria-label={`${cell + 1}번 칸`}
              className={`glow-sequence__cell${activeCell === cell ? " is-active" : ""}`}
              disabled={phase !== "input"}
              key={cell}
              onClick={() => handleCellClick(cell)}
              style={{ "--cell-color": CELL_COLORS[cell % CELL_COLORS.length] }}
              type="button"
            />
          ))}
        </div>

        {phase === "input" ? <div className="glow-sequence__progress" aria-hidden="true"><span style={{ width: `${(inputStep / sequenceLength) * 100}%` }} /></div> : null}
      </div>

      {phase === "idle" ? (
        <GameStageOverlay state="start">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="glow-start-title">
            <GameStageDoodle variant="start" />
            <div className="game-stage-modal__eyebrow">MEMORY / LIGHT</div>
            <h3 id="glow-start-title">빛나는 순서를 기억하세요</h3>
            <p>반짝인 칸을 같은 순서로 선택하면 다음 라운드로 진행해요.</p>
            <Button onClick={startGame}>게임 시작</Button>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === "master" ? (
        <GameStageOverlay state="complete">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="glow-master-title">
            <GameRecordCelebration isNewRecord={didBreakRecordThisAttempt} />
            <div className="game-stage-modal__eyebrow">60 ROUNDS COMPLETE</div>
            <h3 id="glow-master-title">MASTER 달성!</h3>
            <p>{GLOW_SEQUENCE_MASTER_COUNT}개의 빛 순서를 모두 기억했어요. 실수 {mistakes}회로 최종 단계를 완료했습니다.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={startGame}>다시 도전</Button>
              <Button variant="secondary" onClick={() => navigate("/")}>홈으로</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {isExitOpen ? (
        <GameStageOverlay state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="glow-exit-title">
            <div className="game-stage-modal__eyebrow">LEAVE GAME</div>
            <h3 id="glow-exit-title">도전을 나갈까요?</h3>
            <p>최고 라운드는 저장되지만 현재 진행 중인 순서는 종료돼요.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={() => navigate("/")}>나가기</Button>
              <Button variant="secondary" onClick={continueGame}>계속하기</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
