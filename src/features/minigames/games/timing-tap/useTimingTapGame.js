import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { GAME_RECORD_STORAGE_KEYS } from "../../../../shared/storage/localStorageRegistry.js";
import { getStarRating } from "../../shared/gameProgression.js";
import { isNewGameRecord } from "../../shared/gameRecord.js";
import { useGameBrowserBackGuard } from "../../shared/hooks/useGameBrowserBackGuard.js";

import {
  TIMING_TAP_ROUNDS,
  TIMING_TAP_MAX_SCORE,
  getNeedlePosition,
  getTimingRoundConfig,
  judgeTiming,
  scoreTimingResult,
} from "./timingTap.logic.js";

const FEEDBACK_DURATION_MS = 760;
const KEYBOARD_TAP_KEYS = new Set([" ", "Enter"]);
const INTERACTIVE_CONTROL_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[contenteditable='true']",
  "[role='button']",
].join(",");

function isInteractiveControl(target) {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_CONTROL_SELECTOR));
}

function readBestScore() {
  try {
    const score = Number(window.localStorage.getItem(GAME_RECORD_STORAGE_KEYS.TIMING_TAP_BEST_SCORE));
    return Number.isFinite(score) ? Math.max(0, score) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    window.localStorage.setItem(GAME_RECORD_STORAGE_KEYS.TIMING_TAP_BEST_SCORE, String(score));
  } catch {
    return;
  }
}

function vibrate(duration = 10) {
  globalThis.navigator?.vibrate?.(duration);
}

export function useTimingTapGame() {
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
  const navigateFromGame = useGameBrowserBackGuard({
    isExitConfirmationOpen: isExitOpen,
    onNavigate: navigate,
    onRequestExit: requestExit,
  });
  const frameRef = useRef(null);
  const roundStartRef = useRef(0);
  const roundElapsedRef = useRef(0);
  const feedbackTimerRef = useRef(null);
  const feedbackDeadlineRef = useRef(0);
  const feedbackRemainingRef = useRef(0);
  const tapNowRef = useRef(null);
  const phaseRef = useRef(phase);
  const isExitOpenRef = useRef(isExitOpen);
  const roundRef = useRef(round);
  const roundConfigRef = useRef(roundConfig);
  const needlePositionRef = useRef(needlePosition);
  const scoreRef = useRef(score);
  const perfectComboRef = useRef(perfectCombo);
  const focusGaugeRef = useRef(focusGauge);
  const bestRef = useRef(best);

  phaseRef.current = phase;
  isExitOpenRef.current = isExitOpen;
  roundRef.current = round;
  roundConfigRef.current = roundConfig;
  needlePositionRef.current = needlePosition;
  scoreRef.current = score;
  perfectComboRef.current = perfectCombo;
  focusGaugeRef.current = focusGauge;
  bestRef.current = best;

  function beginRound(nextRound) {
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
    feedbackDeadlineRef.current = 0;
    feedbackRemainingRef.current = 0;
    playSound("countdownFinal");
    const useFocusAssist = focusGaugeRef.current >= 100;
    const config = getTimingRoundConfig(nextRound, Math.random, useFocusAssist ? 4 : 0);
    if (useFocusAssist) {
      focusGaugeRef.current = 0;
      setFocusGauge(0);
    }
    roundRef.current = nextRound;
    roundConfigRef.current = config;
    setRound(nextRound);
    setRoundConfig(config);
    setNeedlePosition(0);
    needlePositionRef.current = 0;
    setResult(null);
    roundStartRef.current = performance.now();
    roundElapsedRef.current = 0;
    phaseRef.current = "playing";
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
    isExitOpenRef.current = false;
    setIsExitOpen(false);
    beginRound(1);
  }

  useEffect(() => {
    if (phase !== "playing" || isExitOpen) return undefined;
    function animate(now) {
      const elapsed = now - roundStartRef.current;
      const nextNeedlePosition = getNeedlePosition(elapsed, roundConfig.durationMs);
      roundElapsedRef.current = elapsed;
      needlePositionRef.current = nextNeedlePosition;
      setNeedlePosition(nextNeedlePosition);
      frameRef.current = window.requestAnimationFrame(animate);
    }
    frameRef.current = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [isExitOpen, phase, roundConfig.durationMs]);

  useEffect(() => () => {
    window.cancelAnimationFrame(frameRef.current);
    window.clearTimeout(feedbackTimerRef.current);
  }, []);

  function completeGame(finalScore) {
    playSound("clear");
    phaseRef.current = "completed";
    setPhase("completed");
    const didBreakRecord = isNewGameRecord({ previous: bestRef.current, next: finalScore });
    if (didBreakRecord) {
      bestRef.current = finalScore;
      setBest(finalScore);
      saveBestScore(finalScore);
    }
  }

  function advanceAfterFeedback() {
    feedbackTimerRef.current = null;
    feedbackDeadlineRef.current = 0;
    feedbackRemainingRef.current = 0;
    if (phaseRef.current !== "feedback" || isExitOpenRef.current) return;

    if (roundRef.current >= TIMING_TAP_ROUNDS) {
      completeGame(scoreRef.current);
    } else {
      beginRound(roundRef.current + 1);
    }
  }

  function scheduleFeedbackAdvance(delayMs = FEEDBACK_DURATION_MS) {
    window.clearTimeout(feedbackTimerRef.current);
    const safeDelay = Math.max(0, delayMs);
    feedbackRemainingRef.current = safeDelay;
    feedbackDeadlineRef.current = performance.now() + safeDelay;
    feedbackTimerRef.current = window.setTimeout(advanceAfterFeedback, safeDelay);
  }

  function pauseFeedbackAdvance() {
    if (feedbackTimerRef.current == null) return;
    feedbackRemainingRef.current = Math.max(0, feedbackDeadlineRef.current - performance.now());
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
    feedbackDeadlineRef.current = 0;
  }

  function tapNow() {
    if (phaseRef.current !== "playing" || isExitOpenRef.current) return;
    phaseRef.current = "feedback";
    window.cancelAnimationFrame(frameRef.current);
    const currentRoundConfig = roundConfigRef.current;
    const judged = judgeTiming(
      needlePositionRef.current,
      currentRoundConfig.targetCenter,
      currentRoundConfig.targetWidth,
    );
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
    scheduleFeedbackAdvance();
  }

  tapNowRef.current = tapNow;

  useEffect(() => {
    function handleKeyDown(event) {
      if (!KEYBOARD_TAP_KEYS.has(event.key)) return;
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      if (phaseRef.current !== "playing" || isExitOpenRef.current) return;
      if (isInteractiveControl(event.target)) return;

      event.preventDefault();
      tapNowRef.current?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function requestExit() {
    const currentPhase = phaseRef.current;
    if (currentPhase === "idle" || currentPhase === "completed") {
      navigateFromGame("/");
      return;
    }
    if (isExitOpenRef.current) return;

    isExitOpenRef.current = true;
    if (currentPhase === "playing") {
      roundElapsedRef.current = performance.now() - roundStartRef.current;
      window.cancelAnimationFrame(frameRef.current);
    } else if (currentPhase === "feedback") {
      pauseFeedbackAdvance();
    }
    setIsExitOpen(true);
  }

  function continueGame() {
    if (!isExitOpenRef.current) return;

    isExitOpenRef.current = false;
    if (phaseRef.current === "playing") {
      roundStartRef.current = performance.now() - roundElapsedRef.current;
    } else if (phaseRef.current === "feedback") {
      scheduleFeedbackAdvance(feedbackRemainingRef.current);
    }
    setIsExitOpen(false);
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

  return {
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
  };
}
