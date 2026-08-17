import { useMemo } from "react";
import { getForbiddenPositions, positionKey } from "../domain/index.js";
import { OMOK_MODE, STONE } from "../omok.constants.js";
import { deriveOmokStateFromMoves, getOnlinePlayerStone } from "./omokOnline.utils.js";
import {
  ONLINE_ACTION_STATUS,
  ONLINE_ROOM_LOAD_STATUS,
  ONLINE_ROOM_STATUS,
} from "./omokOnline.constants.js";

function getCurrentPlayer(room, userId) {
  return room?.players?.find((player) => player.userId === userId) ?? null;
}

function getOpponent(room, userId) {
  return room?.players?.find((player) => player.userId !== userId) ?? null;
}

export function useOmokOnlineDerivedState({
  actionStatus,
  currentUserId,
  moves,
  room,
  status,
}) {
  const derivedGame = useMemo(() => {
    if (!room) return deriveOmokStateFromMoves([], OMOK_MODE.STANDARD);
    return deriveOmokStateFromMoves(moves, room.gameMode, room.currentRound);
  }, [moves, room]);
  const currentPlayer = useMemo(() => getCurrentPlayer(room, currentUserId), [currentUserId, room]);
  const opponent = useMemo(() => getOpponent(room, currentUserId), [currentUserId, room]);
  const playerStone = useMemo(() => getOnlinePlayerStone(room, currentUserId), [currentUserId, room]);
  const isOnlineReady = status === ONLINE_ROOM_LOAD_STATUS.READY && Boolean(room);
  const opponentLeft = isOnlineReady && room.status === ONLINE_ROOM_STATUS.PLAYING && !opponent;
  const canSubmitMove = Boolean(
    isOnlineReady &&
    room.status === ONLINE_ROOM_STATUS.PLAYING &&
    !opponentLeft &&
    actionStatus !== ONLINE_ACTION_STATUS.SUBMITTING_MOVE &&
    playerStone &&
    derivedGame.valid &&
    !derivedGame.winner &&
    !derivedGame.draw &&
    derivedGame.turn === playerStone,
  );
  const isStandardRoom = room?.gameMode === OMOK_MODE.STANDARD;
  const effectiveShowForbiddenPositions = Boolean(
    isStandardRoom && room?.allowForbiddenPositions && currentPlayer?.showForbiddenPositions,
  );
  const effectiveExplainForbiddenReasons = Boolean(
    isStandardRoom && room?.allowForbiddenReasons && currentPlayer?.explainForbiddenReasons,
  );
  const forbiddenPositionKeys = useMemo(() => {
    if (
      !effectiveShowForbiddenPositions ||
      derivedGame.turn !== STONE.BLACK ||
      derivedGame.winner ||
      derivedGame.draw
    ) {
      return new Set();
    }

    return new Set(getForbiddenPositions(derivedGame.board).map(positionKey));
  }, [derivedGame.board, derivedGame.draw, derivedGame.turn, derivedGame.winner, effectiveShowForbiddenPositions]);

  return {
    canSubmitMove,
    currentPlayer,
    derivedGame,
    effectiveExplainForbiddenReasons,
    effectiveShowForbiddenPositions,
    forbiddenPositionKeys,
    isOnlineReady,
    opponent,
    opponentLeft,
    playerStone,
  };
}
