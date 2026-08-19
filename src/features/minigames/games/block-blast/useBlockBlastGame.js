import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { GAME_RECORD_STORAGE_KEYS } from "../../../../shared/storage/localStorageRegistry.js";
import { useGameBrowserBackGuard } from "../../shared/hooks/useGameBrowserBackGuard.js";
import { usePuzzleHints } from "../../shared/hooks/usePuzzleHints.js";
import {
  BLOCK_BLAST_SIZE,
  canPlaceBlockPiece,
  createBlockBoard,
  createBlockPieces,
  findBestBlockMove,
  getNextBlockBlastCombo,
  hasBlockMove,
  placeBlockPiece,
} from "./blockBlast.logic.js";

function readBestScore() {
  try {
    const value = Number(window.localStorage.getItem(GAME_RECORD_STORAGE_KEYS.BLOCK_BLAST_BEST_SCORE));
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    window.localStorage.setItem(GAME_RECORD_STORAGE_KEYS.BLOCK_BLAST_BEST_SCORE, String(score));
  } catch {
    // Local records are optional.
  }
}

export function useBlockBlastGame() {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const [phase, setPhase] = useState("idle");
  const [board, setBoard] = useState(createBlockBoard);
  const [pieces, setPieces] = useState(() => createBlockPieces());
  const [selectedPieceIndex, setSelectedPieceIndex] = useState(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(readBestScore);
  const [combo, setCombo] = useState(0);
  const [status, setStatus] = useState("조각을 고른 뒤 보드에 놓아보세요.");
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [previewOrigin, setPreviewOrigin] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const navigateFromGame = useGameBrowserBackGuard({
    isExitConfirmationOpen: isExitOpen,
    onNavigate: navigate,
    onRequestExit: requestExit,
  });
  const dragPieceIndexRef = useRef(null);
  const feedbackSequenceRef = useRef(0);
  const feedbackTimerRef = useRef(null);
  const bestMove = findBestBlockMove(board, pieces);
  const bestPiece = bestMove ? pieces[bestMove.pieceIndex] : null;
  const bestPlacementIndexes = bestMove && bestPiece
    ? bestPiece.cells.map(([rowOffset, colOffset]) => (
      (bestMove.row + rowOffset) * BLOCK_BLAST_SIZE + bestMove.col + colOffset
    ))
    : [];
  const hint = usePuzzleHints(bestMove ? [
    {
      message: `${bestPiece.cells.length}칸 블록부터 살펴보세요. 현재 보드에 안정적으로 놓을 수 있어요.`,
      targetPieceIndex: bestMove.pieceIndex,
    },
    {
      message: bestMove.clearedLines > 0
        ? `이 블록을 놓으면 ${bestMove.clearedLines}줄을 바로 지울 수 있어요.`
        : "빈 공간을 잘게 나누지 않도록 가장자리부터 채우는 수예요.",
      targetPieceIndex: bestMove.pieceIndex,
      targetIndexes: bestPlacementIndexes,
    },
    {
      message: `${bestMove.row + 1}행 ${bestMove.col + 1}열을 시작점으로 선택하세요.`,
      targetPieceIndex: bestMove.pieceIndex,
      targetIndexes: bestPlacementIndexes,
    },
  ] : []);
  const selectedPiece = selectedPieceIndex == null ? null : pieces[selectedPieceIndex];
  const previewIsValid = Boolean(
    selectedPiece
    && previewOrigin
    && canPlaceBlockPiece(board, selectedPiece, previewOrigin.row, previewOrigin.col),
  );
  const previewIndexes = new Set(
    selectedPiece && previewOrigin
      ? selectedPiece.cells
        .map(([rowOffset, colOffset]) => {
          const row = previewOrigin.row + rowOffset;
          const col = previewOrigin.col + colOffset;
          return row >= 0 && row < BLOCK_BLAST_SIZE && col >= 0 && col < BLOCK_BLAST_SIZE
            ? row * BLOCK_BLAST_SIZE + col
            : null;
        })
        .filter((index) => index != null)
      : [],
  );

  function startGame() {
    window.clearTimeout(feedbackTimerRef.current);
    setBoard(createBlockBoard());
    setPieces(createBlockPieces());
    setSelectedPieceIndex(null);
    setScore(0);
    setCombo(0);
    setStatus("조각을 고른 뒤 보드에 놓아보세요.");
    setIsExitOpen(false);
    setPreviewOrigin(null);
    setActionFeedback(null);
    hint.resetHints();
    setPhase("playing");
  }

  useEffect(() => () => window.clearTimeout(feedbackTimerRef.current), []);

  function showActionFeedback(clearedLines, nextCombo) {
    window.clearTimeout(feedbackTimerRef.current);
    feedbackSequenceRef.current += 1;
    const label = clearedLines >= 3
      ? "AMAZING!"
      : clearedLines === 2
        ? "DOUBLE CLEAR!"
        : "LINE CLEAR!";
    setActionFeedback({
      id: feedbackSequenceRef.current,
      label,
      combo: nextCombo,
      comboLabel: nextCombo >= 2 ? `${nextCombo} COMBO` : "",
      durationMs: clearedLines >= 2 || nextCombo >= 2 ? 1120 : 860,
      variant: clearedLines >= 3 ? "major" : nextCombo >= 2 ? "combo" : "standard",
    });
    feedbackTimerRef.current = window.setTimeout(
      () => setActionFeedback(null),
      clearedLines >= 2 || nextCombo >= 2 ? 1140 : 880,
    );
  }

  function finishGame(finalScore) {
    setPhase("gameover");
    playSound("wrong");
    if (finalScore > bestScore) {
      setBestScore(finalScore);
      saveBestScore(finalScore);
    }
  }

  function placeSelected(row, col, explicitPieceIndex = selectedPieceIndex) {
    if (phase !== "playing" || explicitPieceIndex == null || !pieces[explicitPieceIndex]) return;
    const result = placeBlockPiece(board, pieces[explicitPieceIndex], row, col);
    if (!result.placed) {
      setStatus("그 자리에는 조각을 놓을 수 없어요.");
      playSound("wrong");
      return;
    }

    const nextCombo = getNextBlockBlastCombo(combo, result.clearedLines);
    const nextScore = score + result.points + (result.clearedLines > 0 ? nextCombo * 3 : 0);
    let nextPieces = pieces.map((piece, index) => index === explicitPieceIndex ? null : piece);
    if (nextPieces.every((piece) => piece == null)) nextPieces = createBlockPieces();
    setBoard(result.board);
    setPieces(nextPieces);
    setSelectedPieceIndex(null);
    setPreviewOrigin(null);
    setScore(nextScore);
    setCombo(nextCombo);
    setStatus(result.clearedLines > 0 ? `${result.clearedLines}줄을 지웠어요!` : "좋아요. 다음 조각을 놓아보세요.");
    if (result.clearedLines > 0) showActionFeedback(result.clearedLines, nextCombo);
    playSound(result.clearedLines > 0 ? "clear" : "correct");
    if (!hasBlockMove(result.board, nextPieces)) finishGame(nextScore);
  }

  function requestExit() {
    if (phase === "idle" || phase === "gameover") {
      navigateFromGame("/");
      return;
    }
    setIsExitOpen(true);
    setPhase("paused");
  }

  function pauseGame() {
    if (phase !== "playing") return;
    setPhase("paused");
  }

  function resumeGame() {
    if (phase !== "paused" || isExitOpen) return;
    setPhase("playing");
  }

  function continueGame() {
    setIsExitOpen(false);
    setPhase("playing");
  }

  function selectPiece(pieceIndex) {
    const piece = pieces[pieceIndex];
    if (phase !== "playing" || !piece) return;
    setSelectedPieceIndex(pieceIndex);
    setPreviewOrigin(null);
    setStatus(`${piece.cells.length}칸 블록을 선택했어요. 보드의 점 표시가 있는 칸에 놓아보세요.`);
  }

  return {
    score,
    bestScore,
    combo,
    phase,
    pauseGame,
    isExitOpen,
    resumeGame,
    requestExit,
    setPreviewOrigin,
    board,
    selectedPiece,
    previewIndexes,
    previewIsValid,
    hint,
    placeSelected,
    dragPieceIndexRef,
    actionFeedback,
    pieces,
    selectedPieceIndex,
    selectPiece,
    status,
    startGame,
    navigateFromGame,
    continueGame,
  };
}
