import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { RANKING_GAME } from "../../../ranking/rankingConstants.js";
import { createRankedRandom } from "../../../ranking/rankedGameProof.js";
import { useGameResultSubmission } from "../../../ranking/useGameResultSubmission.js";
import { GameStage } from "../../shared/components/GameStage.jsx";
import {
  MEMORY_ORDER_INITIAL_LIVES,
  MEMORY_ORDER_ROUNDS,
  chargeMemoryReplayGauge,
  createMemoryRound,
  evaluateMemoryChoice,
  getMemoryRoundAward,
  resolveMemoryFailure,
  shouldUpdateMemoryBest,
} from "./memoryOrder.logic.js";
import { readMemoryBestRound, saveMemoryBestRound } from "./memoryBestRecord.js";
import { MemoryGameBoard } from "./MemoryGameBoard.jsx";
import {
  MEMORY_COUNTDOWN_LABELS,
  MEMORY_FAILURE_REASON,
  MEMORY_PHASE,
  MEMORY_SYMBOLS,
  MEMORY_TIMING,
  isMemoryTimerUrgent,
} from "./memoryGameConfig.js";
import { MemoryGameOverlays } from "./MemoryGameOverlays.jsx";
import "./memory-game.css";

const PHASE = MEMORY_PHASE;
const FAILURE_REASON = MEMORY_FAILURE_REASON;
const COUNTDOWN_LABELS = MEMORY_COUNTDOWN_LABELS;

const DEFAULT_GAME_META = {
  eyebrow: "MEMORY / ORDER",
  title: "Memory Sequence",
  description: "제한 시간 동안 순서를 기억하고 그대로 선택하세요.",
};

export { MEMORY_SYMBOLS, MEMORY_TIMING, isMemoryTimerUrgent } from "./memoryGameConfig.js";
export { MEMORY_PHASE as MEMORY_TIMER_PHASE } from "./memoryGameConfig.js";

function focusElement(element) {
  if (!element?.focus) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

export function MemoryOrderGame({ game = DEFAULT_GAME_META }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const rankingSubmission = useGameResultSubmission();
  const initialData = useMemo(() => createMemoryRound(1, MEMORY_SYMBOLS), []);
  const [round, setRound] = useState(1);
  const [data, setData] = useState(initialData);
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [step, setStep] = useState(0);
  const [best, setBest] = useState(() => readMemoryBestRound());
  const [remainingMs, setRemainingMs] = useState(initialData.selectionSeconds * 1000);
  const [countdownIndex, setCountdownIndex] = useState(0);
  const [failureReason, setFailureReason] = useState(null);
  const [didBreakRecordThisAttempt, setDidBreakRecordThisAttempt] = useState(false);
  const [correctFeedback, setCorrectFeedback] = useState(null);
  const [correctAnnouncement, setCorrectAnnouncement] = useState("");
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(MEMORY_ORDER_INITIAL_LIVES);
  const [replayGauge, setReplayGauge] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [failureStatus, setFailureStatus] = useState(null);

  const activeTimerRef = useRef(null);
  const roundTransitionTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const feedbackSequenceRef = useRef(0);
  const previousPhaseRef = useRef(null);
  const resolvingRef = useRef(false);
  const phaseRef = useRef(phase);
  const roundRef = useRef(round);
  const dataRef = useRef(data);
  const stepRef = useRef(step);
  const bestRef = useRef(best);
  const countdownIndexRef = useRef(countdownIndex);
  const stageContentRef = useRef(null);
  const pauseButtonRef = useRef(null);
  const resumeButtonRef = useRef(null);
  const retryButtonRef = useRef(null);
  const scoreRef = useRef(score);
  const comboRef = useRef(combo);
  const livesRef = useRef(lives);
  const replayGaugeRef = useRef(replayGauge);
  const rankedRandomRef = useRef(Math.random);
  const rankedRoundsRef = useRef([]);
  const roundChoicesRef = useRef([]);
  const isStartingRef = useRef(false);

  const canPause = phase === PHASE.COUNTDOWN || phase === PHASE.PREVIEW || phase === PHASE.PLAYING;
  const isStageCovered =
    phase === PHASE.IDLE ||
    phase === PHASE.COUNTDOWN ||
    phase === PHASE.TURN_READY ||
    phase === PHASE.CLEARED ||
    phase === PHASE.PAUSED ||
    phase === PHASE.FAILED ||
    phase === PHASE.REPLAYING ||
    phase === PHASE.COMPLETED ||
    isExitConfirmOpen;
  const isTimerUrgent = isMemoryTimerUrgent(phase, remainingMs);
  const sequenceDensity = data.count <= 4 ? "comfortable" : data.count <= 7 ? "compact" : "dense";

  phaseRef.current = phase;
  roundRef.current = round;
  dataRef.current = data;
  stepRef.current = step;
  bestRef.current = best;
  countdownIndexRef.current = countdownIndex;
  scoreRef.current = score;
  comboRef.current = combo;
  livesRef.current = lives;
  replayGaugeRef.current = replayGauge;

  useEffect(() => {
    if (!stageContentRef.current) return;
    stageContentRef.current.inert = isStageCovered;
  }, [isStageCovered]);

  useEffect(() => {
    if (phase === PHASE.PAUSED) focusElement(resumeButtonRef.current);
    if (phase === PHASE.FAILED) focusElement(retryButtonRef.current);
  }, [phase]);

  useEffect(() => () => clearGameTimers({ updateFeedback: false }), []);

  function clearActiveTimer({ preserve = false } = {}) {
    const timer = activeTimerRef.current;
    if (!timer) return;
    window.clearTimeout(timer.timeoutId);
    window.clearInterval(timer.intervalId);
    if (preserve) {
      activeTimerRef.current = {
        ...timer,
        intervalId: null,
        timeoutId: null,
        remainingMs: Math.max(0, timer.deadline - performance.now()),
      };
      return;
    }
    activeTimerRef.current = null;
  }

  function clearRoundTransitionTimer() {
    if (!roundTransitionTimerRef.current) return;
    window.clearTimeout(roundTransitionTimerRef.current);
    roundTransitionTimerRef.current = null;
  }

  function clearCorrectFeedback({ updateState = true } = {}) {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    if (updateState) {
      setCorrectFeedback(null);
      setCorrectAnnouncement("");
    }
  }

  function clearGameTimers({ updateFeedback = true } = {}) {
    clearActiveTimer();
    clearRoundTransitionTimer();
    clearCorrectFeedback({ updateState: updateFeedback });
  }

  function runTimer(kind, durationMs) {
    clearActiveTimer();
    const safeDuration = Math.max(0, durationMs);
    const deadline = performance.now() + safeDuration;
    const updateRemaining = () => {
      const next = Math.max(0, deadline - performance.now());
      if (kind === "preview" || kind === "selection") setRemainingMs(next);
    };
    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 50);
    const timeoutId = window.setTimeout(() => {
      clearActiveTimer();
      handleTimerComplete(kind);
    }, safeDuration);
    activeTimerRef.current = {
      kind,
      deadline,
      durationMs: safeDuration,
      remainingMs: safeDuration,
      intervalId,
      timeoutId,
    };
  }

  function resumeActiveTimer() {
    const timer = activeTimerRef.current;
    if (!timer) return;
    runTimer(timer.kind, timer.remainingMs);
  }

  function handleTimerComplete(kind) {
    if (phaseRef.current === PHASE.PAUSED) return;
    if (kind === "countdown") {
      const nextIndex = countdownIndexRef.current + 1;
      if (nextIndex < COUNTDOWN_LABELS.length) {
        startCountdown(nextIndex, MEMORY_TIMING.COUNTDOWN_STEP_MS);
        return;
      }
      startPreview();
      return;
    }
    if (kind === "preview") {
      startTurnReady();
      return;
    }
    if (kind === "turn-ready") {
      startSelection();
      return;
    }
    if (kind === "selection") {
      failRound(FAILURE_REASON.TIMEOUT);
    }
  }

  function startCountdown(index = 0, durationMs = MEMORY_TIMING.COUNTDOWN_STEP_MS) {
    playSound(index === COUNTDOWN_LABELS.length - 1 ? "countdownFinal" : "countdown");
    setPhase(PHASE.COUNTDOWN);
    phaseRef.current = PHASE.COUNTDOWN;
    setCountdownIndex(index);
    countdownIndexRef.current = index;
    runTimer("countdown", durationMs);
  }

  function startPreview() {
    const nextDuration = dataRef.current.previewSeconds * 1000;
    setPhase(PHASE.PREVIEW);
    phaseRef.current = PHASE.PREVIEW;
    setRemainingMs(nextDuration);
    runTimer("preview", nextDuration);
  }

  function startTurnReady() {
    setPhase(PHASE.TURN_READY);
    phaseRef.current = PHASE.TURN_READY;
    setRemainingMs(dataRef.current.selectionSeconds * 1000);
    runTimer("turn-ready", MEMORY_TIMING.INPUT_GUIDE_DURATION_MS);
  }

  function startSelection() {
    const selectionDuration = dataRef.current.selectionSeconds * 1000;
    resolvingRef.current = false;
    setPhase(PHASE.PLAYING);
    phaseRef.current = PHASE.PLAYING;
    setRemainingMs(selectionDuration);
    runTimer("selection", selectionDuration);
  }

  function updateBestCompletedRound(completedRound) {
    if (!shouldUpdateMemoryBest(bestRef.current, completedRound)) return;
    saveMemoryBestRound(completedRound);
    bestRef.current = completedRound;
    setBest(completedRound);
    setDidBreakRecordThisAttempt(true);
  }

  function startRound(nextRound, { resetRecord = true, showCountdown = false } = {}) {
    clearGameTimers();
    resolvingRef.current = false;
    const nextData = createMemoryRound(nextRound, MEMORY_SYMBOLS, rankedRandomRef.current);
    roundChoicesRef.current = [];
    setRound(nextRound);
    roundRef.current = nextRound;
    setData(nextData);
    dataRef.current = nextData;
    setStep(0);
    stepRef.current = 0;
    setFailureReason(null);
    if (resetRecord) setDidBreakRecordThisAttempt(false);
    setCountdownIndex(0);
    countdownIndexRef.current = 0;
    setRemainingMs(nextData.selectionSeconds * 1000);
    if (showCountdown) startCountdown(0);
    else startPreview();
  }

  function resetToIdle() {
    clearGameTimers();
    resolvingRef.current = false;
    const nextData = createMemoryRound(1, MEMORY_SYMBOLS);
    setRound(1);
    roundRef.current = 1;
    setData(nextData);
    dataRef.current = nextData;
    setPhase(PHASE.IDLE);
    phaseRef.current = PHASE.IDLE;
    previousPhaseRef.current = null;
    setStep(0);
    stepRef.current = 0;
    setFailureReason(null);
    setDidBreakRecordThisAttempt(false);
    setCountdownIndex(0);
    countdownIndexRef.current = 0;
    setRemainingMs(nextData.selectionSeconds * 1000);
    setIsExitConfirmOpen(false);
    scoreRef.current = 0;
    comboRef.current = 0;
    livesRef.current = MEMORY_ORDER_INITIAL_LIVES;
    replayGaugeRef.current = 0;
    setScore(0);
    setCombo(0);
    setLives(MEMORY_ORDER_INITIAL_LIVES);
    setReplayGauge(0);
    setMistakes(0);
    setFailureStatus(null);
  }

  function requestExit() {
    if (phaseRef.current === PHASE.IDLE || phaseRef.current === PHASE.FAILED || phaseRef.current === PHASE.COMPLETED) {
      clearGameTimers();
      navigate("/");
      return;
    }
    setIsExitConfirmOpen(true);
  }

  function cancelExit() {
    setIsExitConfirmOpen(false);
  }

  function confirmExit() {
    clearGameTimers();
    setIsExitConfirmOpen(false);
    navigate("/");
  }

  async function startGame() {
    if (phaseRef.current !== PHASE.IDLE) return;
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    try {
      const attempt = await rankingSubmission.startAttempt({ gameKey: RANKING_GAME.MEMORY });
      if (!attempt) return;
      rankedRandomRef.current = attempt?.seed ? createRankedRandom(attempt.seed) : Math.random;
      rankedRoundsRef.current = [];
      roundChoicesRef.current = [];
      scoreRef.current = 0;
      comboRef.current = 0;
      livesRef.current = MEMORY_ORDER_INITIAL_LIVES;
      replayGaugeRef.current = 0;
      setScore(0);
      setCombo(0);
      setLives(MEMORY_ORDER_INITIAL_LIVES);
      setReplayGauge(0);
      setMistakes(0);
      setFailureStatus(null);
      startRound(1, { showCountdown: true });
    } finally {
      isStartingRef.current = false;
    }
  }

  function retryRound() {
    setFailureStatus(null);
    startRound(roundRef.current, { resetRecord: false });
  }

  function failRound(reason) {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    clearActiveTimer();
    clearRoundTransitionTimer();
    clearCorrectFeedback();
    setFailureReason(reason);
    rankedRoundsRef.current.push({
      choices: [...roundChoicesRef.current],
      timedOut: reason === FAILURE_REASON.TIMEOUT,
    });
    roundChoicesRef.current = [];
    setMistakes((current) => current + 1);
    comboRef.current = 0;
    setCombo(0);
    const resolution = resolveMemoryFailure({
      lives: livesRef.current,
      replayGauge: replayGaugeRef.current,
    });
    livesRef.current = resolution.lives;
    replayGaugeRef.current = resolution.replayGauge;
    setLives(resolution.lives);
    setReplayGauge(resolution.replayGauge);
    setFailureStatus(resolution.status);

    if (resolution.status === "replay") {
      playSound("success");
      setPhase(PHASE.REPLAYING);
      phaseRef.current = PHASE.REPLAYING;
      roundTransitionTimerRef.current = window.setTimeout(() => {
        roundTransitionTimerRef.current = null;
        startRound(roundRef.current, { resetRecord: false });
      }, 700);
      return;
    }

    playSound(resolution.status === "over" ? "gameOver" : "wrong");
    setPhase(PHASE.FAILED);
    phaseRef.current = PHASE.FAILED;
    if (resolution.status === "over") {
      void rankingSubmission.submitResult({
        gameKey: RANKING_GAME.MEMORY,
        proof: { rounds: [...rankedRoundsRef.current] },
      });
    }
  }

  function completeRound() {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    playSound("clear");
    clearActiveTimer();
    rankedRoundsRef.current.push({
      choices: [...roundChoicesRef.current],
      timedOut: false,
    });
    roundChoicesRef.current = [];
    updateBestCompletedRound(roundRef.current);
    const award = getMemoryRoundAward(dataRef.current.count, comboRef.current);
    const nextScore = scoreRef.current + award.points;
    const nextGauge = chargeMemoryReplayGauge(replayGaugeRef.current);
    scoreRef.current = nextScore;
    comboRef.current = award.combo;
    replayGaugeRef.current = nextGauge;
    setScore(nextScore);
    setCombo(award.combo);
    setReplayGauge(nextGauge);

    if (roundRef.current >= MEMORY_ORDER_ROUNDS) {
      setPhase(PHASE.COMPLETED);
      phaseRef.current = PHASE.COMPLETED;
      void rankingSubmission.submitResult({
        gameKey: RANKING_GAME.MEMORY,
        proof: { rounds: [...rankedRoundsRef.current] },
      });
      return;
    }
    setPhase(PHASE.CLEARED);
    phaseRef.current = PHASE.CLEARED;
    clearRoundTransitionTimer();
    roundTransitionTimerRef.current = window.setTimeout(() => {
      roundTransitionTimerRef.current = null;
      startRound(roundRef.current + 1, { resetRecord: false });
    }, MEMORY_TIMING.ROUND_CLEAR_DURATION_MS);
  }

  function playCorrectButtonMotion(button) {
    if (!button?.animate) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    button.getAnimations?.().forEach((animation) => animation.cancel());
    button.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.04)", offset: 0.42 },
        { transform: "scale(1)" },
      ],
      { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }

  function showCorrectFeedback(symbol) {
    playSound("correct");
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    feedbackSequenceRef.current += 1;
    setCorrectFeedback({ symbolId: symbol.id, sequence: feedbackSequenceRef.current });
    setCorrectAnnouncement(`${symbol.name} 정답`);
    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null;
      setCorrectFeedback(null);
      setCorrectAnnouncement("");
    }, MEMORY_TIMING.CORRECT_FEEDBACK_MS);
  }

  function choose(symbol, event) {
    if (phaseRef.current !== PHASE.PLAYING || resolvingRef.current) return;
    const currentStep = stepRef.current;
    roundChoicesRef.current.push(symbol.id);
    const result = evaluateMemoryChoice(dataRef.current.sequence, currentStep, symbol.id);
    if (!result.correct) {
      failRound(FAILURE_REASON.WRONG);
      return;
    }
    playCorrectButtonMotion(event.currentTarget);
    showCorrectFeedback(symbol);
    stepRef.current = result.nextStep;
    setStep(result.nextStep);
    if (result.complete) completeRound();
  }

  function pauseGame() {
    if (!canPause || phaseRef.current === PHASE.PAUSED) return;
    previousPhaseRef.current = phaseRef.current;
    clearActiveTimer({ preserve: true });
    setPhase(PHASE.PAUSED);
    phaseRef.current = PHASE.PAUSED;
  }

  function resumeGame() {
    const previousPhase = previousPhaseRef.current;
    if (!previousPhase || phaseRef.current !== PHASE.PAUSED) return;
    setPhase(previousPhase);
    phaseRef.current = previousPhase;
    previousPhaseRef.current = null;
    resumeActiveTimer();
    window.requestAnimationFrame(() => focusElement(pauseButtonRef.current));
  }

  const gameActions = (
    <>
      {canPause ? (
        <Button ref={pauseButtonRef} className="memory-game__pause" variant="secondary" type="button" onClick={pauseGame}>
          일시정지
        </Button>
      ) : null}
      <Button variant="secondary" type="button" onClick={requestExit}>
        게임 나가기
      </Button>
    </>
  );
  const sidebar = (
    <>
      <div className="stat-row">
        <div className="stat">
          <div className="l">Score</div>
          <div className="v">{score}</div>
        </div>
        <div className="stat">
          <div className="l">Combo</div>
          <div className="v">×{combo}</div>
        </div>
        <div className="stat">
          <div className="l">Round</div>
          <div className="v">{Math.min(round, MEMORY_ORDER_ROUNDS)}<small> / {MEMORY_ORDER_ROUNDS}</small></div>
        </div>
        <div className="stat">
          <div className="l">Lives</div>
          <div className="v">{lives}</div>
        </div>
      </div>
      <p className="game-stage__side-note">다시 보기 {replayGauge}% {replayGauge >= 100 ? "· READY" : ""}</p>
    </>
  );

  return (
    <GameStage
      className="memory-game"
      eyebrow={game.eyebrow}
      title={game.title}
      actions={gameActions}
      isExitConfirmationOpen={isExitConfirmOpen}
      onRequestExit={requestExit}
      sidebar={sidebar}
      ariaLabel={game.title}
    >
      <MemoryGameBoard
        correctAnnouncement={correctAnnouncement}
        correctFeedback={correctFeedback}
        data={data}
        isStageCovered={isStageCovered}
        isTimerUrgent={isTimerUrgent}
        onChoose={choose}
        phase={phase}
        remainingMs={remainingMs}
        round={round}
        sequenceDensity={sequenceDensity}
        stageContentRef={stageContentRef}
        step={step}
      />
      <MemoryGameOverlays
        cancelExit={cancelExit}
        combo={combo}
        confirmExit={confirmExit}
        countdownIndex={countdownIndex}
        didBreakRecordThisAttempt={didBreakRecordThisAttempt}
        failureReason={failureReason}
        failureStatus={failureStatus}
        isExitConfirmOpen={isExitConfirmOpen}
        isStageCovered={isStageCovered}
        mistakes={mistakes}
        phase={phase}
        rankingSubmission={rankingSubmission}
        requestExit={requestExit}
        resetToIdle={resetToIdle}
        resumeButtonRef={resumeButtonRef}
        resumeGame={resumeGame}
        retryButtonRef={retryButtonRef}
        retryRound={retryRound}
        round={round}
        score={score}
        startGame={startGame}
      />
    </GameStage>
  );
}
