import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { GAME_RECORD_STORAGE_KEYS } from "../../../../shared/storage/localStorageRegistry.js";
import { RANKING_BOARD } from "../../../ranking/rankingRegistry.js";
import { createRankedRandom } from "../../../ranking/rankedGameProof.js";
import { useGameResultSubmission } from "../../../ranking/useGameResultSubmission.js";
import { isNewGameRecord } from "../../shared/gameRecord.js";
import { useGameBrowserBackGuard } from "../../shared/hooks/useGameBrowserBackGuard.js";

import {
  FINAL_TARGET_TILE,
  GAME_2048_DIRECTION,
  GAME_2048_PHASE,
  SWIPE_AXIS_DELTA,
  SWIPE_THRESHOLD,
  TARGET_TILES,
} from "./game2048.constants.js";
import {
  addRandomTile,
  createEmptyBoard,
  createInitialBoard,
  getEmptyCellCount,
  getMaxTile,
  hasAvailableMove,
  hasReachedTarget,
  moveBoard,
} from "./game2048.logic.js";

const KEY_TO_DIRECTION = {
  ArrowUp: GAME_2048_DIRECTION.UP,
  ArrowRight: GAME_2048_DIRECTION.RIGHT,
  ArrowDown: GAME_2048_DIRECTION.DOWN,
  ArrowLeft: GAME_2048_DIRECTION.LEFT,
  w: GAME_2048_DIRECTION.UP,
  W: GAME_2048_DIRECTION.UP,
  d: GAME_2048_DIRECTION.RIGHT,
  D: GAME_2048_DIRECTION.RIGHT,
  s: GAME_2048_DIRECTION.DOWN,
  S: GAME_2048_DIRECTION.DOWN,
  a: GAME_2048_DIRECTION.LEFT,
  A: GAME_2048_DIRECTION.LEFT,
};

function getBestScore() {
  try {
    const value = Number(window.localStorage.getItem(GAME_RECORD_STORAGE_KEYS.GAME_2048_BEST_SCORE));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    window.localStorage.setItem(GAME_RECORD_STORAGE_KEYS.GAME_2048_BEST_SCORE, String(score));
  } catch {
    return;
  }
}

export function formatNumber(value) {
  return value.toLocaleString("ko-KR");
}

export function getTileSizeClass(value) {
  if (value >= 16384) return "is-tiny";
  if (value >= 1024) return "is-small";
  if (value >= 128) return "is-medium";
  return "";
}

function getPhaseStatus(phase, round, currentTarget) {
  if (phase === GAME_2048_PHASE.IDLE) return "시작 전";
  if (phase === GAME_2048_PHASE.MILESTONE_CLEAR) return `라운드 ${round} 완료`;
  if (phase === GAME_2048_PHASE.COMPLETED) return `${FINAL_TARGET_TILE} 완료`;
  if (phase === GAME_2048_PHASE.ENDLESS) return `${FINAL_TARGET_TILE} 완료, 계속 플레이 중`;
  if (phase === GAME_2048_PHASE.GAME_OVER) return "게임 오버";
  return `라운드 ${round}, 목표 ${currentTarget}`;
}

export function getNextTargetLabel(targetIndex) {
  return TARGET_TILES[targetIndex + 1] ?? TARGET_TILES[TARGET_TILES.length - 1];
}

export function useGame2048() {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const rankingSubmission = useGameResultSubmission();
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => getBestScore());
  const [targetIndex, setTargetIndex] = useState(0);
  const [phase, setPhase] = useState(GAME_2048_PHASE.IDLE);
  const [didBreakRecordThisAttempt, setDidBreakRecordThisAttempt] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const navigateFromGame = useGameBrowserBackGuard({
    isExitConfirmationOpen: isExitConfirmOpen,
    onNavigate: navigate,
    onRequestExit: requestExit,
  });

  const boardRef = useRef(board);
  const scoreRef = useRef(score);
  const bestScoreRef = useRef(bestScore);
  const targetIndexRef = useRef(targetIndex);
  const phaseRef = useRef(phase);
  const boardElementRef = useRef(null);
  const pointerStartRef = useRef(null);
  const rankedRandomRef = useRef(Math.random);
  const rankedMovesRef = useRef([]);
  const isStartingRef = useRef(false);

  const round = targetIndex + 1;
  const currentTarget = TARGET_TILES[targetIndex] ?? TARGET_TILES[TARGET_TILES.length - 1];
  const maxTile = useMemo(() => getMaxTile(board), [board]);
  const emptyCellCount = useMemo(() => getEmptyCellCount(board), [board]);
  const phaseStatus = getPhaseStatus(phase, round, currentTarget);
  const canMoveBoard = (phase === GAME_2048_PHASE.PLAYING || phase === GAME_2048_PHASE.ENDLESS) && !isResetConfirmOpen && !isExitConfirmOpen;
  const hasStarted = phase !== GAME_2048_PHASE.IDLE;
  const isStageCovered = phase === GAME_2048_PHASE.IDLE || isResetConfirmOpen || isExitConfirmOpen || phase === GAME_2048_PHASE.MILESTONE_CLEAR || phase === GAME_2048_PHASE.COMPLETED || phase === GAME_2048_PHASE.GAME_OVER;

  boardRef.current = board;
  scoreRef.current = score;
  bestScoreRef.current = bestScore;
  targetIndexRef.current = targetIndex;
  phaseRef.current = phase;

  function focusBoard() {
    window.setTimeout(() => boardElementRef.current?.focus(), 0);
  }

  function updateBestScore(nextScore) {
    if (!isNewGameRecord({ previous: bestScoreRef.current, next: nextScore })) return;
    setDidBreakRecordThisAttempt(true);
    bestScoreRef.current = nextScore;
    setBestScore(nextScore);
    saveBestScore(nextScore);
  }

  async function startNewGame() {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    try {
      const attempt = await rankingSubmission.startAttempt(RANKING_BOARD.GAME_2048_CLASSIC);
      if (!attempt) return;
      rankedRandomRef.current = attempt?.seed ? createRankedRandom(attempt.seed) : Math.random;
      rankedMovesRef.current = [];

      playSound("countdownFinal");
      const nextBoard = createInitialBoard(rankedRandomRef.current);
      setBoard(nextBoard);
      setScore(0);
      setDidBreakRecordThisAttempt(false);
      setTargetIndex(0);
      setIsResetConfirmOpen(false);
      setPhase(GAME_2048_PHASE.PLAYING);
      focusBoard();
    } finally {
      isStartingRef.current = false;
    }
  }

  function requestNewGame() {
    if (phaseRef.current === GAME_2048_PHASE.IDLE) {
      void startNewGame();
      return;
    }
    if (phaseRef.current === GAME_2048_PHASE.GAME_OVER || phaseRef.current === GAME_2048_PHASE.COMPLETED) {
      void startNewGame();
      return;
    }
    setIsResetConfirmOpen(true);
  }

  function submitRankedResult() {
    void rankingSubmission.submitResult({
      proof: { moves: [...rankedMovesRef.current] },
    });
  }

  function closeResetConfirm() {
    setIsResetConfirmOpen(false);
  }

  function finishMove(nextBoard, scoreDelta) {
    const nextScore = scoreRef.current + scoreDelta;
    setBoard(nextBoard);
    setScore(nextScore);
    updateBestScore(nextScore);

    if (phaseRef.current !== GAME_2048_PHASE.ENDLESS && hasReachedTarget(nextBoard, TARGET_TILES[targetIndexRef.current])) {
      if (targetIndexRef.current === TARGET_TILES.length - 1) {
        playSound("clear");
        setPhase(GAME_2048_PHASE.COMPLETED);
        submitRankedResult();
        return;
      }
      playSound("clear");
      setPhase(GAME_2048_PHASE.MILESTONE_CLEAR);
      return;
    }

    if (!hasAvailableMove(nextBoard)) {
      playSound("gameOver");
      setPhase(GAME_2048_PHASE.GAME_OVER);
      if (phaseRef.current !== GAME_2048_PHASE.ENDLESS) submitRankedResult();
      return;
    }

    playSound(scoreDelta > 0 ? "success" : "move");
  }

  function handleMove(direction) {
    if (!canMoveBoard) return;
    rankedMovesRef.current.push(direction);
    const result = moveBoard(boardRef.current, direction);
    if (!result.changed) {
      if (!hasAvailableMove(boardRef.current)) {
        playSound("gameOver");
        setPhase(GAME_2048_PHASE.GAME_OVER);
        if (phaseRef.current !== GAME_2048_PHASE.ENDLESS) submitRankedResult();
      }
      return;
    }
    finishMove(addRandomTile(result.board, rankedRandomRef.current), result.scoreDelta);
  }

  function handleBoardKeyDown(event) {
    const direction = KEY_TO_DIRECTION[event.key];
    if (!direction || !canMoveBoard) return;
    event.preventDefault();
    handleMove(direction);
  }

  function handlePointerDown(event) {
    if (!canMoveBoard) return;
    if (pointerStartRef.current) return;
    pointerStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp(event) {
    if (!canMoveBoard || !pointerStartRef.current) return;
    if (pointerStartRef.current.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;
    pointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const maxDelta = Math.max(absX, absY);
    const axisDelta = Math.abs(absX - absY);
    if (maxDelta < SWIPE_THRESHOLD || axisDelta < SWIPE_AXIS_DELTA) return;
    if (absX > absY) {
      handleMove(deltaX > 0 ? GAME_2048_DIRECTION.RIGHT : GAME_2048_DIRECTION.LEFT);
      return;
    }
    handleMove(deltaY > 0 ? GAME_2048_DIRECTION.DOWN : GAME_2048_DIRECTION.UP);
  }

  function handlePointerCancel(event) {
    if (pointerStartRef.current?.pointerId !== event.pointerId) return;
    pointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function requestExit() {
    pointerStartRef.current = null;
    if (phaseRef.current === GAME_2048_PHASE.IDLE || phaseRef.current === GAME_2048_PHASE.GAME_OVER || phaseRef.current === GAME_2048_PHASE.COMPLETED) {
      navigateFromGame("/");
      return;
    }
    setIsExitConfirmOpen(true);
  }

  function confirmExit() {
    pointerStartRef.current = null;
    navigateFromGame("/");
  }

  function continueToNextTarget() {
    const nextIndex = targetIndexRef.current + 1;
    setTargetIndex(nextIndex);
    if (hasReachedTarget(boardRef.current, TARGET_TILES[nextIndex])) {
      if (nextIndex === TARGET_TILES.length - 1) {
        playSound("clear");
        setPhase(GAME_2048_PHASE.COMPLETED);
        submitRankedResult();
        return;
      }
      playSound("clear");
      setPhase(GAME_2048_PHASE.MILESTONE_CLEAR);
      return;
    }
    if (!hasAvailableMove(boardRef.current)) {
      playSound("gameOver");
      setPhase(GAME_2048_PHASE.GAME_OVER);
      submitRankedResult();
      return;
    }
    setPhase(GAME_2048_PHASE.PLAYING);
    focusBoard();
  }

  function continueEndless() {
    if (!hasAvailableMove(boardRef.current)) {
      playSound("gameOver");
      setPhase(GAME_2048_PHASE.GAME_OVER);
      return;
    }
    setPhase(GAME_2048_PHASE.ENDLESS);
    focusBoard();
  }

  return {
    hasStarted,
    requestNewGame,
    requestExit,
    phase,
    round,
    currentTarget,
    score,
    bestScore,
    phaseStatus,
    maxTile,
    boardElementRef,
    handleBoardKeyDown,
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    board,
    emptyCellCount,
    isStageCovered,
    isExitConfirmOpen,
    isResetConfirmOpen,
    startNewGame,
    rankingSubmission,
    setIsExitConfirmOpen,
    confirmExit,
    targetIndex,
    continueToNextTarget,
    didBreakRecordThisAttempt,
    continueEndless,
    closeResetConfirm,
  };
}
