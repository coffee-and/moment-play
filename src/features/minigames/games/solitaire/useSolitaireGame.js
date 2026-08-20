import { useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { getStreakCelebrationCopy, useGameStreak } from "../../shared/gameStreak.js";
import { isNewGameRecord, RECORD_DIRECTION } from "../../shared/gameRecord.js";
import { formatActiveGameTime, useActiveGameTimer } from "../../shared/hooks/useActiveGameTimer.js";
import { useGameBrowserBackGuard } from "../../shared/hooks/useGameBrowserBackGuard.js";
import { usePuzzleHints } from "../../shared/hooks/usePuzzleHints.js";
import {
  analyzeSolitaireProgress,
  findSolitaireHint,
  SOLITAIRE_PROGRESS_STATUS,
} from "./solitaire.analysis.js";
import { createCertifiedSolitaireDeal } from "./solitaire.deals.js";
import {
  drawSolitaireStock,
  getSolitaireRankLabel,
  getSolitaireSelectionCard,
  isSolitaireWon,
  isValidTableauRun,
  moveSolitaireSelection,
  SOLITAIRE_DIFFICULTY,
  SOLITAIRE_DRAW_COUNT,
} from "./solitaire.logic.js";
import { EMPTY_DIFFICULTY_RECORD, readSolitaireRecords, saveSolitaireRecords } from "./solitaireRecords.js";
import {
  createSolitaireState,
  SOLITAIRE_DIALOG,
  SOLITAIRE_PHASE,
  solitaireReducer,
} from "./solitaireReducer.js";
import { useSolitaireDrag } from "./useSolitaireDrag.js";

function createInitialState() {
  const difficulty = SOLITAIRE_DIFFICULTY.EASY;
  const deal = createCertifiedSolitaireDeal(difficulty);
  return createSolitaireState({ board: deal.board, dealId: deal.id, difficulty });
}

function createHintSteps(suggestedMove) {
  if (!suggestedMove) return [];
  if (suggestedMove.type === "draw") {
    const drawMessage = suggestedMove.drawSteps > 1
      ? `스톡을 ${suggestedMove.drawSteps}번 더 확인하면 옮길 수 있는 카드가 나와요.`
      : "스톡을 누르면 옮길 수 있는 카드가 나와요.";
    return [
      { message: "현재 카드 열에서는 바로 옮길 수 있는 카드가 없어요.", showStock: true },
      { message: drawMessage, showStock: true },
      { message: "표시된 스톡을 눌러 다음 카드를 공개하세요.", showStock: true },
    ];
  }

  const cardLabel = `${getSolitaireRankLabel(suggestedMove.card.rank)} ${suggestedMove.card.symbol}`;
  const destinationLabel = suggestedMove.destination.type === "foundation"
    ? `${suggestedMove.card.symbol} 완성 칸`
    : `${suggestedMove.destination.column + 1}번째 카드 열`;
  return [
    { message: `${cardLabel} 카드를 먼저 살펴보세요.`, source: suggestedMove.source },
    {
      message: suggestedMove.destination.type === "foundation"
        ? "같은 문양은 완성 칸에 A부터 숫자 순서대로 올릴 수 있어요."
        : "카드 열에는 색을 번갈아 한 단계 낮은 숫자를 올릴 수 있어요.",
      destination: suggestedMove.destination,
      source: suggestedMove.source,
    },
    {
      message: `${cardLabel} 카드를 ${destinationLabel}(으)로 옮겨보세요.`,
      destination: suggestedMove.destination,
      source: suggestedMove.source,
    },
  ];
}

export function useSolitaireGame() {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const gameStreak = useGameStreak();
  const nextRoundPendingRef = useRef(false);
  const [state, dispatch] = useReducer(solitaireReducer, undefined, createInitialState);
  const [records, setRecords] = useState(readSolitaireRecords);
  const isExitOpen = state.dialog === SOLITAIRE_DIALOG.EXIT;
  const isNewGameOpen = state.dialog === SOLITAIRE_DIALOG.NEW_GAME;
  const navigateFromGame = useGameBrowserBackGuard({
    isExitConfirmationOpen: isExitOpen,
    onNavigate: navigate,
    onRequestExit: requestExit,
  });
  const { elapsedMs, resetTimer } = useActiveGameTimer(
    state.phase === SOLITAIRE_PHASE.PLAYING && state.dialog === null,
  );
  const drawCount = SOLITAIRE_DRAW_COUNT[state.difficulty];
  const suggestedMove = findSolitaireHint(state.board, drawCount);
  const baseHint = usePuzzleHints(createHintSteps(suggestedMove));
  const difficultyRecord = records[state.difficulty] ?? EMPTY_DIFFICULTY_RECORD;
  const time = formatActiveGameTime(elapsedMs);

  function markAssisted() {
    dispatch({ type: "MARK_ASSISTED" });
    gameStreak.disqualifyRound();
  }

  const hint = {
    ...baseHint,
    acceptHint() {
      markAssisted();
      baseHint.acceptHint();
    },
  };

  function startGame(nextDifficulty = state.difficulty, { preserveStreak = false } = {}) {
    const excludedDealId = nextDifficulty === state.difficulty ? state.dealId : null;
    const deal = createCertifiedSolitaireDeal(nextDifficulty, Math.random, excludedDealId);
    gameStreak.beginRound({ preserveStreak });
    dispatch({
      type: "START_GAME",
      board: deal.board,
      dealId: deal.id,
      difficulty: nextDifficulty,
    });
    baseHint.resetHints();
    nextRoundPendingRef.current = false;
    resetTimer();
    playSound("countdownFinal");
  }

  function completeGame(finalBoard) {
    if (state.phase !== SOLITAIRE_PHASE.PLAYING) return;
    const isRecordEligible = !state.assisted && !baseHint.hasUsedHint;
    if (!isRecordEligible) gameStreak.disqualifyRound();
    gameStreak.recordSuccess();
    const finalSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
    const currentRecord = records[state.difficulty] ?? EMPTY_DIFFICULTY_RECORD;
    const didBreakRecord = isRecordEligible && isNewGameRecord({
      previous: currentRecord.bestTimeSeconds,
      next: finalSeconds,
      direction: RECORD_DIRECTION.LOWER,
    });
    const nextRecords = {
      ...records,
      [state.difficulty]: {
        bestTimeSeconds: didBreakRecord ? finalSeconds : currentRecord.bestTimeSeconds,
        completedCount: currentRecord.completedCount + 1,
      },
    };
    setRecords(nextRecords);
    saveSolitaireRecords(nextRecords);
    dispatch({ type: "COMPLETE", board: finalBoard, isNewRecord: didBreakRecord });
    playSound("clear");
  }

  function commitBoard(nextBoard) {
    if (isSolitaireWon(nextBoard)) {
      completeGame(nextBoard);
      return;
    }
    const progress = analyzeSolitaireProgress(nextBoard, drawCount);
    dispatch({
      type: "COMMIT_BOARD",
      board: nextBoard,
      isStalled: progress.status === SOLITAIRE_PROGRESS_STATUS.STALEMATE,
    });
  }

  function applyMove(source, destination) {
    if (state.phase !== SOLITAIRE_PHASE.PLAYING) return false;
    const result = moveSolitaireSelection(state.board, source, destination);
    if (!result.moved) {
      playSound("wrong");
      return false;
    }
    commitBoard(result.state);
    playSound("move");
    return true;
  }

  function setSelection(selection) {
    dispatch({ type: "SELECT", selection });
  }

  const drag = useSolitaireDrag({
    enabled: state.phase === SOLITAIRE_PHASE.PLAYING,
    onMove: applyMove,
    onSelect: setSelection,
  });

  function chooseSource(source) {
    if (state.phase !== SOLITAIRE_PHASE.PLAYING) return;
    if (drag.consumeSuppressedClick()) return;
    if (state.selection) {
      const destination = source.type === "tableau"
        ? { type: "tableau", column: source.column }
        : source.type === "foundation"
          ? { type: "foundation", suit: source.suit }
          : null;
      if (destination && applyMove(state.selection, destination)) return;
    }

    if (
      source.type === "tableau"
      && !isValidTableauRun(state.board.tableau[source.column], source.index)
    ) {
      setSelection(null);
      return;
    }
    if (!getSolitaireSelectionCard(state.board, source)) {
      setSelection(null);
      return;
    }
    const isSameSelection = JSON.stringify(state.selection) === JSON.stringify(source);
    setSelection(isSameSelection ? null : source);
  }

  function chooseDestination(destination) {
    if (state.selection) applyMove(state.selection, destination);
  }

  function moveToFoundation(source) {
    const card = getSolitaireSelectionCard(state.board, source);
    if (card) applyMove(source, { type: "foundation", suit: card.suit });
  }

  function drawStock() {
    if (state.phase !== SOLITAIRE_PHASE.PLAYING) return;
    const result = drawSolitaireStock(state.board, drawCount);
    if (!result.moved) return;
    commitBoard(result.state);
    playSound("move");
  }

  function undo() {
    if (state.history.length === 0) return;
    markAssisted();
    dispatch({ type: "UNDO" });
    baseHint.resetHintSteps();
    playSound("move");
  }

  function requestExit() {
    if (state.phase === SOLITAIRE_PHASE.IDLE || state.phase === SOLITAIRE_PHASE.COMPLETED) {
      navigateFromGame("/");
      return;
    }
    dispatch({ type: "OPEN_DIALOG", dialog: SOLITAIRE_DIALOG.EXIT });
  }

  function confirmExit() {
    gameStreak.disqualifyRound();
    navigateFromGame("/");
  }

  function chooseDifficulty() {
    gameStreak.disqualifyRound();
    dispatch({ type: "CHOOSE_DIFFICULTY" });
  }

  function startNextRound() {
    if (nextRoundPendingRef.current) return;
    nextRoundPendingRef.current = true;
    startGame(state.difficulty, { preserveStreak: true });
  }

  function isHintSource(source) {
    const hintSource = hint.currentStep?.source;
    if (!hintSource || !source || hintSource.type !== source.type) return false;
    if (source.type === "waste") return true;
    if (source.type === "tableau") {
      return hintSource.column === source.column && hintSource.index === source.index;
    }
    return hintSource.suit === source.suit;
  }

  function isHintDestination(destination) {
    const hintDestination = hint.currentStep?.destination;
    if (!hintDestination || !destination || hintDestination.type !== destination.type) return false;
    return destination.type === "tableau"
      ? hintDestination.column === destination.column
      : hintDestination.suit === destination.suit;
  }

  return {
    ...state,
    assisted: state.assisted || baseHint.hasUsedHint,
    chooseDestination,
    chooseDifficulty,
    chooseSource,
    closeDialog: () => dispatch({ type: "CLOSE_DIALOG" }),
    confirmExit,
    difficultyRecord,
    drag,
    drawCount,
    drawStock,
    gameStreak,
    hint,
    isExitOpen,
    isHintDestination,
    isHintSource,
    isNewGameOpen,
    moveToFoundation,
    openNewGame: () => dispatch({ type: "OPEN_DIALOG", dialog: SOLITAIRE_DIALOG.NEW_GAME }),
    records,
    requestExit,
    startGame,
    startNextRound,
    streakCopy: getStreakCelebrationCopy(gameStreak.completionStreak),
    time,
    undo,
  };
}
