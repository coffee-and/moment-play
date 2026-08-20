import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { isNewGameRecord } from "../../shared/gameRecord.js";
import { useGameBrowserBackGuard } from "../../shared/hooks/useGameBrowserBackGuard.js";
import {
  GLOW_SEQUENCE_PHASE,
  GLOW_SEQUENCE_ROUND_OUTCOME,
  GLOW_SEQUENCE_STANDARD_END_ROUND,
  GLOW_SEQUENCE_START_ROUND,
  GLOW_SEQUENCE_TIMING,
} from "./glowSequence.config.js";
import {
  createGlowSequence,
  evaluateGlowChoice,
  getGlowGridSize,
  getGlowPlaybackDuration,
  getGlowPlaybackTiming,
  getGlowRoundLimit,
  getGlowRoundOutcome,
  getGlowSequenceLength,
} from "./glowSequence.logic.js";
import {
  readGlowSequenceBestRound,
  saveGlowSequenceBestRound,
} from "./glowSequenceRecords.js";

const TERMINAL_PHASES = new Set([
  GLOW_SEQUENCE_PHASE.IDLE,
  GLOW_SEQUENCE_PHASE.STANDARD_COMPLETE,
  GLOW_SEQUENCE_PHASE.MASTER_COMPLETE,
]);

export function useGlowSequenceGame() {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const timersRef = useRef(new Set());
  const phaseRef = useRef(GLOW_SEQUENCE_PHASE.IDLE);
  const roundRef = useRef(GLOW_SEQUENCE_START_ROUND);
  const sequenceRef = useRef([]);
  const inputStepRef = useRef(0);
  const bestRoundRef = useRef(0);
  const pausedPhaseRef = useRef(null);
  const [phase, setPhase] = useState(GLOW_SEQUENCE_PHASE.IDLE);
  const [round, setRound] = useState(GLOW_SEQUENCE_START_ROUND);
  const [sequence, setSequence] = useState([]);
  const [activeCell, setActiveCell] = useState(null);
  const [inputStep, setInputStep] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [bestRound, setBestRound] = useState(() => readGlowSequenceBestRound());
  const [didBreakRecordThisAttempt, setDidBreakRecordThisAttempt] = useState(false);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const navigateFromGame = useGameBrowserBackGuard({
    isExitConfirmationOpen: isExitOpen,
    onNavigate: navigate,
    onRequestExit: requestExit,
  });

  phaseRef.current = phase;
  roundRef.current = round;
  sequenceRef.current = sequence;
  inputStepRef.current = inputStep;
  bestRoundRef.current = bestRound;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const schedule = useCallback((callback, delay) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
  }, []);

  const updatePhase = useCallback((nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const showSequence = useCallback((nextSequence) => {
    clearTimers();
    const timing = getGlowPlaybackTiming();
    setInputStep(0);
    inputStepRef.current = 0;
    setActiveCell(null);
    updatePhase(GLOW_SEQUENCE_PHASE.SHOWING);

    nextSequence.forEach((cell, index) => {
      const startAt = timing.leadMs + index * (timing.onMs + timing.gapMs);
      schedule(() => {
        setActiveCell(cell);
        playSound("correct");
      }, startAt);
      schedule(() => setActiveCell(null), startAt + timing.onMs);
    });

    schedule(() => {
      setActiveCell(null);
      updatePhase(GLOW_SEQUENCE_PHASE.INPUT);
    }, getGlowPlaybackDuration(nextSequence.length));
  }, [clearTimers, playSound, schedule, updatePhase]);

  const beginRound = useCallback((nextRound) => {
    const length = getGlowSequenceLength(nextRound);
    const nextSequence = createGlowSequence(getGlowGridSize(), length);
    setRound(nextRound);
    roundRef.current = nextRound;
    setSequence(nextSequence);
    sequenceRef.current = nextSequence;
    showSequence(nextSequence);
  }, [showSequence]);

  const updateBest = useCallback((completedRound) => {
    if (!isNewGameRecord({ previous: bestRoundRef.current, next: completedRound })) return;
    bestRoundRef.current = completedRound;
    setBestRound(completedRound);
    setDidBreakRecordThisAttempt(true);
    saveGlowSequenceBestRound(completedRound);
  }, []);

  const startGame = useCallback(() => {
    clearTimers();
    pausedPhaseRef.current = null;
    setMistakes(0);
    setDidBreakRecordThisAttempt(false);
    setIsExitOpen(false);
    beginRound(GLOW_SEQUENCE_START_ROUND);
  }, [beginRound, clearTimers]);

  const chooseCell = useCallback((cell) => {
    if (phaseRef.current !== GLOW_SEQUENCE_PHASE.INPUT) return;
    const result = evaluateGlowChoice(sequenceRef.current, inputStepRef.current, cell);
    if (!result.correct) {
      playSound("wrong");
      setMistakes((current) => current + 1);
      updatePhase(GLOW_SEQUENCE_PHASE.RETRY);
      schedule(() => showSequence(sequenceRef.current), GLOW_SEQUENCE_TIMING.RETRY_DELAY_MS);
      return;
    }

    setActiveCell(cell);
    schedule(() => setActiveCell(null), GLOW_SEQUENCE_TIMING.CELL_FEEDBACK_MS);
    setInputStep(result.nextStep);
    inputStepRef.current = result.nextStep;

    if (!result.complete) {
      playSound("correct");
      return;
    }

    const completedRound = roundRef.current;
    const outcome = getGlowRoundOutcome(completedRound);
    updateBest(completedRound);

    if (outcome === GLOW_SEQUENCE_ROUND_OUTCOME.STANDARD_COMPLETE) {
      playSound("clear");
      updatePhase(GLOW_SEQUENCE_PHASE.STANDARD_COMPLETE);
      return;
    }
    if (outcome === GLOW_SEQUENCE_ROUND_OUTCOME.MASTER_COMPLETE) {
      playSound("clear");
      updatePhase(GLOW_SEQUENCE_PHASE.MASTER_COMPLETE);
      return;
    }

    playSound("correct");
    updatePhase(GLOW_SEQUENCE_PHASE.ROUND_CLEARED);
    schedule(
      () => beginRound(completedRound + 1),
      GLOW_SEQUENCE_TIMING.ROUND_CLEAR_MS,
    );
  }, [beginRound, playSound, schedule, showSequence, updateBest, updatePhase]);

  const continueToMaster = useCallback(() => {
    if (phaseRef.current !== GLOW_SEQUENCE_PHASE.STANDARD_COMPLETE) return;
    pausedPhaseRef.current = null;
    beginRound(GLOW_SEQUENCE_STANDARD_END_ROUND + 1);
  }, [beginRound]);

  function requestExit() {
    if (TERMINAL_PHASES.has(phaseRef.current)) {
      clearTimers();
      navigateFromGame("/");
      return;
    }
    clearTimers();
    pausedPhaseRef.current = phaseRef.current;
    updatePhase(GLOW_SEQUENCE_PHASE.PAUSED);
    setIsExitOpen(true);
  }

  const cancelExit = useCallback(() => {
    const pausedPhase = pausedPhaseRef.current;
    pausedPhaseRef.current = null;
    setIsExitOpen(false);
    if (pausedPhase === GLOW_SEQUENCE_PHASE.ROUND_CLEARED) {
      beginRound(roundRef.current + 1);
      return;
    }
    showSequence(sequenceRef.current);
  }, [beginRound, showSequence]);

  const confirmExit = useCallback(() => {
    clearTimers();
    pausedPhaseRef.current = null;
    setIsExitOpen(false);
    navigateFromGame("/");
  }, [clearTimers, navigateFromGame]);

  const sequenceLength = getGlowSequenceLength(round);
  const gridSize = getGlowGridSize();
  const cells = useMemo(
    () => Array.from({ length: gridSize * gridSize }, (_, index) => index),
    [gridSize],
  );

  return {
    activeCell,
    bestRound,
    cancelExit,
    cells,
    chooseCell,
    confirmExit,
    continueToMaster,
    didBreakRecordThisAttempt,
    gridSize,
    inputStep,
    isExitOpen,
    mistakes,
    phase,
    requestExit,
    round,
    roundLimit: getGlowRoundLimit(round),
    sequenceLength,
    startGame,
  };
}
