import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chooseComputerMove } from "./ai/index.js";
import {
  COMPUTER_DIFFICULTY,
  FORBIDDEN_REASON,
  OMOK_COMPUTER_MOVE_DELAY_MS,
  OMOK_MODE,
  OMOK_RESULT_REASON,
  OMOK_TOTAL_CELLS,
  STONE,
} from "./omok.constants.js";
import {
  createEmptyBoard,
  getForbiddenPositions,
  getNextStone,
  playMove,
  positionKey,
} from "./domain/index.js";

function isForbiddenReason(reason) {
  return Object.values(FORBIDDEN_REASON).includes(reason);
}

export function useOmokGame({
  computerDifficulty = COMPUTER_DIFFICULTY.NORMAL,
  computerStone = null,
  explainForbiddenReasons = true,
  gameMode = OMOK_MODE.STANDARD,
  isActive = true,
  resetKey = 0,
  showForbiddenPositions = true,
} = {}) {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [turn, setTurn] = useState(STONE.BLACK);
  const [lastMove, setLastMove] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState([]);
  const [moveCount, setMoveCount] = useState(0);
  const [draw, setDraw] = useState(false);
  const [resultReason, setResultReason] = useState(null);
  const [forbiddenFeedback, setForbiddenFeedback] = useState(null);

  const feedbackIdRef = useRef(0);
  const computerMoveTimerRef = useRef(null);

  const isComputerThinking = Boolean(isActive && computerStone && turn === computerStone && !winner && !draw);

  const clearComputerMoveTimer = useCallback(() => {
    if (!computerMoveTimerRef.current) return;
    window.clearTimeout(computerMoveTimerRef.current);
    computerMoveTimerRef.current = null;
  }, []);

  const restartGame = useCallback(() => {
    clearComputerMoveTimer();
    setBoard(createEmptyBoard());
    setTurn(STONE.BLACK);
    setLastMove(null);
    setWinner(null);
    setWinningLine([]);
    setMoveCount(0);
    setDraw(false);
    setResultReason(null);
    setForbiddenFeedback(null);
  }, [clearComputerMoveTimer]);

  useEffect(() => restartGame(), [resetKey, restartGame]);

  useEffect(() => {
    if (!forbiddenFeedback) return undefined;

    const timeoutId = window.setTimeout(() => {
      setForbiddenFeedback(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [forbiddenFeedback]);

  useEffect(() => () => clearComputerMoveTimer(), [clearComputerMoveTimer]);

  const forbiddenPositionKeys = useMemo(() => {
    if (
      gameMode !== OMOK_MODE.STANDARD ||
      turn !== STONE.BLACK ||
      winner ||
      draw ||
      !showForbiddenPositions ||
      isComputerThinking
    ) {
      return new Set();
    }

    return new Set(getForbiddenPositions(board).map(positionKey));
  }, [board, draw, gameMode, isComputerThinking, showForbiddenPositions, turn, winner]);

  const playStone = useCallback(
    (position, { allowComputer = false } = {}) => {
      if (!isActive || winner || draw) return false;
      if (isComputerThinking && !allowComputer) return false;

      const result = playMove(board, position, turn, gameMode);

      if (!result.valid) {
        if (explainForbiddenReasons && isForbiddenReason(result.reason)) {
          feedbackIdRef.current += 1;
          setForbiddenFeedback({
            id: feedbackIdRef.current,
            position,
            reason: result.reason,
          });
        }
        return false;
      }

      const nextMoveCount = moveCount + 1;
      setBoard(result.board);
      setLastMove(position);
      setMoveCount(nextMoveCount);
      setForbiddenFeedback(null);

      if (result.winner) {
        setWinner(result.winner);
        setWinningLine(result.winningLine);
        setResultReason(OMOK_RESULT_REASON.WIN);
        return true;
      }

      if (result.draw || nextMoveCount === OMOK_TOTAL_CELLS) {
        setDraw(true);
        setResultReason(OMOK_RESULT_REASON.DRAW);
        return true;
      }

      setTurn(getNextStone(turn));
      return true;
    },
    [board, draw, explainForbiddenReasons, gameMode, isActive, isComputerThinking, moveCount, turn, winner],
  );

  const playUserMove = useCallback((position) => playStone(position), [playStone]);

  useEffect(() => {
    if (!isComputerThinking || !computerStone) return undefined;

    const timeoutId = window.setTimeout(() => {
      computerMoveTimerRef.current = null;
      const move = chooseComputerMove(board, computerStone, gameMode, computerDifficulty);
      if (move) playStone(move, { allowComputer: true });
    }, OMOK_COMPUTER_MOVE_DELAY_MS);

    computerMoveTimerRef.current = timeoutId;

    return () => {
      window.clearTimeout(timeoutId);
      if (computerMoveTimerRef.current === timeoutId) {
        computerMoveTimerRef.current = null;
      }
    };
  }, [board, computerDifficulty, computerStone, gameMode, isComputerThinking, playStone]);

  return {
    board,
    turn,
    lastMove,
    winner,
    winningLine,
    moveCount,
    draw,
    resultReason,
    forbiddenFeedback,
    forbiddenPositionKeys,
    isComputerThinking,
    playUserMove,
    restartGame,
  };
}
