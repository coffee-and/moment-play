import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { omokOnlineRoomGateway } from "../../../../infrastructure/supabase/omokOnlineRoomGateway.js";
import { getForbiddenPositions, validateMove, positionKey } from "./domain/index.js";
import { FORBIDDEN_REASON_LABEL, OMOK_MODE, STONE } from "./omok.constants.js";
import {
  deriveOmokStateFromMoves,
  getOnlinePlayerStone,
  isValidOnlineRoomId,
  validateOnlineNickname,
} from "./online/omokOnline.utils.js";
import {
  ONLINE_ACTION_STATUS,
  ONLINE_COPY_RESET_MS,
  ONLINE_PENDING_ACTION,
  ONLINE_POLL_INTERVAL_MS,
  ONLINE_ROOM_LOAD_STATUS,
  ONLINE_ROOM_STATUS,
} from "./online/omokOnline.constants.js";

const ONLINE_UNAVAILABLE_MESSAGE = "온라인 방 기능을 사용하려면 Supabase 환경 변수가 필요합니다.";

const initialState = {
  status: ONLINE_ROOM_LOAD_STATUS.IDLE,
  actionStatus: ONLINE_ACTION_STATUS.IDLE,
  room: null,
  moves: [],
  currentUserId: null,
  inviteUrl: "",
  copied: false,
  errorMessage: null,
  syncWarning: null,
  pendingAction: null,
  needsNicknameSetup: false,
  profileNickname: null,
};

function getErrorMessage(error, fallbackMessage = "온라인 방을 처리하는 중 문제가 발생했어요.") {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && typeof error.message === "string") return error.message;
  return fallbackMessage;
}

function getCurrentPlayer(room, userId) {
  return room?.players?.find((player) => player.userId === userId) ?? null;
}

function getOpponent(room, userId) {
  return room?.players?.find((player) => player.userId !== userId) ?? null;
}

export function useOmokOnlineRoom({
  gateway = omokOnlineRoomGateway,
  onNavigateToLobby,
  onNavigateToRoom,
  roomId = null,
} = {}) {
  const [state, setState] = useState(initialState);
  const mountedRef = useRef(false);
  const roomIdRef = useRef(null);
  const refreshInFlightRef = useRef(false);
  const pendingActionRef = useRef(null);
  const copiedTimeoutRef = useRef(null);
  const autoJoinRoomIdRef = useRef(null);

  const derivedGame = useMemo(() => {
    if (!state.room) return deriveOmokStateFromMoves([], OMOK_MODE.STANDARD);
    return deriveOmokStateFromMoves(state.moves, state.room.gameMode, state.room.currentRound);
  }, [state.moves, state.room]);

  const currentPlayer = useMemo(() => getCurrentPlayer(state.room, state.currentUserId), [state.currentUserId, state.room]);
  const opponent = useMemo(() => getOpponent(state.room, state.currentUserId), [state.currentUserId, state.room]);
  const playerStone = useMemo(() => getOnlinePlayerStone(state.room, state.currentUserId), [state.currentUserId, state.room]);
  const isSubmittingMove = state.actionStatus === ONLINE_ACTION_STATUS.SUBMITTING_MOVE;
  const isOnlineReady = state.status === ONLINE_ROOM_LOAD_STATUS.READY && Boolean(state.room);
  const opponentLeft = isOnlineReady && state.room.status === ONLINE_ROOM_STATUS.PLAYING && !opponent;
  const canSubmitMove = Boolean(
    isOnlineReady &&
    state.room.status === ONLINE_ROOM_STATUS.PLAYING &&
    !opponentLeft &&
    !isSubmittingMove &&
    playerStone &&
    derivedGame.valid &&
    !derivedGame.winner &&
    !derivedGame.draw &&
    derivedGame.turn === playerStone,
  );

  const isStandardRoom = state.room?.gameMode === OMOK_MODE.STANDARD;
  const effectiveShowForbiddenPositions = Boolean(
    isStandardRoom && state.room?.allowForbiddenPositions && currentPlayer?.showForbiddenPositions,
  );
  const effectiveExplainForbiddenReasons = Boolean(
    isStandardRoom && state.room?.allowForbiddenReasons && currentPlayer?.explainForbiddenReasons,
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

  const applySnapshot = useCallback((snapshot) => {
    if (!snapshot?.room || !Array.isArray(snapshot.moves)) return;
    setState((previous) => {
      if (previous.room?.id && previous.room.id !== snapshot.room.id) return previous;
      return {
        ...previous,
        status: ONLINE_ROOM_LOAD_STATUS.READY,
        actionStatus: ONLINE_ACTION_STATUS.IDLE,
        currentUserId: snapshot.userId ?? previous.currentUserId,
        inviteUrl: snapshot.inviteUrl ?? previous.inviteUrl,
        room: snapshot.room,
        moves: snapshot.moves,
        errorMessage: null,
        syncWarning: null,
      };
    });
  }, []);

  const runAction = useCallback(
    async (actionStatus, callback, fallbackMessage) => {
      setState((previous) => ({
        ...previous,
        actionStatus,
        errorMessage: null,
      }));

      try {
        const snapshot = await callback();
        if (!mountedRef.current) return null;
        applySnapshot(snapshot);
        return snapshot;
      } catch (error) {
        if (!mountedRef.current) return null;
        setState((previous) => ({
          ...previous,
          actionStatus: ONLINE_ACTION_STATUS.IDLE,
          errorMessage: getErrorMessage(error, fallbackMessage),
        }));
        return null;
      }
    },
    [applySnapshot],
  );

  const refreshRoom = useCallback(async () => {
    const activeRoomId = roomIdRef.current;
    if (!activeRoomId || refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;
    try {
      const snapshot = await gateway.refreshRoom(activeRoomId);
      if (!mountedRef.current || roomIdRef.current !== activeRoomId) return;
      applySnapshot(snapshot);
    } catch (error) {
      if (!mountedRef.current || roomIdRef.current !== activeRoomId) return;
      setState((previous) => ({
        ...previous,
        syncWarning: getErrorMessage(error, "온라인 방 정보를 새로고침하지 못했습니다."),
      }));
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [applySnapshot, gateway]);

  const executePendingAction = useCallback(
    async (pendingAction) => {
      pendingActionRef.current = null;

      if (pendingAction.type === ONLINE_PENDING_ACTION.CREATE_ROOM) {
        const result = await runAction(
          ONLINE_ACTION_STATUS.CREATING,
          () => gateway.createRoom(pendingAction.payload),
          "방을 만들지 못했습니다.",
        );
        if (result?.room?.id) {
          roomIdRef.current = result.room.id;
          onNavigateToRoom?.(result.room.id);
        }
        return result;
      }

      if (pendingAction.type === ONLINE_PENDING_ACTION.JOIN_ROOM) {
        const result = await runAction(
          ONLINE_ACTION_STATUS.JOINING,
          () => gateway.joinRoom(pendingAction.roomId),
          "방에 입장하지 못했습니다.",
        );
        if (result?.room?.id) {
          roomIdRef.current = result.room.id;
          onNavigateToRoom?.(result.room.id);
        }
        return result;
      }

      return null;
    },
    [gateway, onNavigateToRoom, runAction],
  );

  const prepareOnlineAction = useCallback(
    async (pendingAction) => {
      if (!gateway.isConfigured()) {
        setState((previous) => ({
          ...previous,
          status: ONLINE_ROOM_LOAD_STATUS.ERROR,
          actionStatus: ONLINE_ACTION_STATUS.IDLE,
          errorMessage: ONLINE_UNAVAILABLE_MESSAGE,
        }));
        return null;
      }

      if (pendingAction.type === ONLINE_PENDING_ACTION.JOIN_ROOM && !isValidOnlineRoomId(pendingAction.roomId)) {
        setState((previous) => ({
          ...previous,
          status: ONLINE_ROOM_LOAD_STATUS.ERROR,
          actionStatus: ONLINE_ACTION_STATUS.IDLE,
          errorMessage: "초대 링크의 방 ID가 올바르지 않습니다.",
        }));
        return null;
      }

      pendingActionRef.current = pendingAction;
      setState((previous) => ({
        ...previous,
        status: ONLINE_ROOM_LOAD_STATUS.CHECKING_PROFILE,
        actionStatus: ONLINE_ACTION_STATUS.CHECKING_PROFILE,
        errorMessage: null,
      }));

      try {
        const profileState = await gateway.getCurrentProfileState();
        if (!mountedRef.current) return null;

        if (profileState.needsNicknameSetup) {
          setState((previous) => ({
            ...previous,
            actionStatus: ONLINE_ACTION_STATUS.IDLE,
            currentUserId: profileState.userId,
            needsNicknameSetup: true,
            pendingAction,
            profileNickname: null,
          }));
          return null;
        }

        setState((previous) => ({
          ...previous,
          currentUserId: profileState.userId,
          profileNickname: profileState.nickname,
        }));

        return executePendingAction(pendingAction);
      } catch (error) {
        if (!mountedRef.current) return null;
        pendingActionRef.current = null;
        setState((previous) => ({
          ...previous,
          status: ONLINE_ROOM_LOAD_STATUS.ERROR,
          actionStatus: ONLINE_ACTION_STATUS.IDLE,
          errorMessage: getErrorMessage(error, "온라인 프로필을 확인하지 못했습니다."),
        }));
        return null;
      }
    },
    [executePendingAction, gateway],
  );

  const createRoom = useCallback(
    (payload) => prepareOnlineAction({ type: ONLINE_PENDING_ACTION.CREATE_ROOM, payload }),
    [prepareOnlineAction],
  );

  const joinRoom = useCallback(
    (targetRoomId) => prepareOnlineAction({ type: ONLINE_PENDING_ACTION.JOIN_ROOM, roomId: targetRoomId }),
    [prepareOnlineAction],
  );

  const saveNicknameAndResume = useCallback(
    async (nickname) => {
      const validation = validateOnlineNickname(nickname);
      if (!validation.valid) {
        setState((previous) => ({ ...previous, errorMessage: validation.message }));
        return null;
      }

      const pendingAction = pendingActionRef.current ?? state.pendingAction;
      if (!pendingAction) return null;

      setState((previous) => ({
        ...previous,
        actionStatus: ONLINE_ACTION_STATUS.SAVING_NICKNAME,
        errorMessage: null,
      }));

      try {
        const profileState = await gateway.saveCurrentProfileNickname(validation.value);
        if (!mountedRef.current) return null;
        setState((previous) => ({
          ...previous,
          currentUserId: profileState.userId,
          needsNicknameSetup: false,
          pendingAction: null,
          profileNickname: profileState.nickname,
        }));
        return executePendingAction(pendingAction);
      } catch (error) {
        if (!mountedRef.current) return null;
        setState((previous) => ({
          ...previous,
          actionStatus: ONLINE_ACTION_STATUS.IDLE,
          errorMessage: getErrorMessage(error, "닉네임을 저장하지 못했습니다."),
        }));
        return null;
      }
    },
    [executePendingAction, gateway, state.pendingAction],
  );

  const setReady = useCallback(
    (ready) => {
      if (!state.room) return null;
      return runAction(
        ONLINE_ACTION_STATUS.UPDATING_READY,
        () => gateway.setReady(state.room.id, ready),
        "준비 상태를 바꾸지 못했습니다.",
      );
    },
    [gateway, runAction, state.room],
  );

  const setGuidePreferences = useCallback(
    (guideSettings) => {
      if (!state.room) return null;
      return runAction(
        ONLINE_ACTION_STATUS.UPDATING_READY,
        () => gateway.setGuidePreferences(state.room.id, guideSettings),
        "안내 설정을 저장하지 못했습니다.",
      );
    },
    [gateway, runAction, state.room],
  );

  const updateRoomSettings = useCallback(
    (roomSettings) => {
      if (!state.room) return null;
      return runAction(
        ONLINE_ACTION_STATUS.UPDATING_READY,
        () => gateway.updateRoomSettings(state.room.id, roomSettings),
        "방 설정을 저장하지 못했습니다.",
      );
    },
    [gateway, runAction, state.room],
  );

  const startRoom = useCallback(() => {
    if (!state.room) return null;
    return runAction(
      ONLINE_ACTION_STATUS.STARTING,
      () => gateway.startRoom(state.room.id),
      "대국을 시작하지 못했습니다.",
    );
  }, [gateway, runAction, state.room]);

  const submitMove = useCallback(
    async (position) => {
      if (!state.room || !playerStone || !canSubmitMove) return false;

      const validation = validateMove(derivedGame.board, position, playerStone, state.room.gameMode);
      if (!validation.valid) {
        const reasonLabel = effectiveExplainForbiddenReasons ? FORBIDDEN_REASON_LABEL[validation.reason] : null;
        setState((previous) => ({
          ...previous,
          errorMessage: validation.reason === "occupied"
            ? "이미 돌이 놓인 자리입니다."
            : reasonLabel ?? "둘 수 없는 자리입니다.",
        }));
        return false;
      }

      const snapshot = await runAction(
        ONLINE_ACTION_STATUS.SUBMITTING_MOVE,
        () => gateway.submitMove({
          moveNumber: derivedGame.moveCount,
          position,
          roomId: state.room.id,
          roundNumber: state.room.currentRound,
          stone: playerStone,
        }),
        "착수를 동기화하지 못했습니다.",
      );

      return Boolean(snapshot);
    },
    [canSubmitMove, derivedGame.board, derivedGame.moveCount, effectiveExplainForbiddenReasons, gateway, playerStone, runAction, state.room],
  );

  const requestRematch = useCallback(() => {
    if (!state.room) return null;
    return runAction(
      ONLINE_ACTION_STATUS.REQUESTING_REMATCH,
      () => gateway.requestRematch(state.room.id),
      "재대결을 요청하지 못했습니다.",
    );
  }, [gateway, runAction, state.room]);

  const cancelRematch = useCallback(() => {
    if (!state.room) return null;
    return runAction(
      ONLINE_ACTION_STATUS.CANCELLING_REMATCH,
      () => gateway.cancelRematch(state.room.id),
      "재대결 요청을 취소하지 못했습니다.",
    );
  }, [gateway, runAction, state.room]);

  const acceptRematch = useCallback(() => {
    if (!state.room) return null;
    return runAction(
      ONLINE_ACTION_STATUS.ACCEPTING_REMATCH,
      () => gateway.acceptRematch(state.room.id),
      "재대결을 수락하지 못했습니다.",
    );
  }, [gateway, runAction, state.room]);

  const leaveRoom = useCallback(async () => {
    const activeRoomId = state.room?.id;
    if (!activeRoomId) {
      setState(initialState);
      onNavigateToLobby?.();
      return;
    }

    setState((previous) => ({
      ...previous,
      actionStatus: ONLINE_ACTION_STATUS.LEAVING,
      errorMessage: null,
    }));

    try {
      await gateway.leaveRoom(activeRoomId);
      if (!mountedRef.current) return;
      roomIdRef.current = null;
      pendingActionRef.current = null;
      setState(initialState);
      onNavigateToLobby?.();
    } catch (error) {
      if (!mountedRef.current) return;
      setState((previous) => ({
        ...previous,
        actionStatus: ONLINE_ACTION_STATUS.IDLE,
        errorMessage: getErrorMessage(error, "방을 나가지 못했습니다."),
      }));
    }
  }, [gateway, onNavigateToLobby, state.room?.id]);

  const copyInviteUrl = useCallback(async () => {
    if (!state.inviteUrl) return false;
    if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(state.inviteUrl);
      setState((previous) => ({ ...previous, copied: true, errorMessage: null }));
      copiedTimeoutRef.current = window.setTimeout(() => {
        setState((previous) => ({ ...previous, copied: false }));
      }, ONLINE_COPY_RESET_MS);
      return true;
    } catch {
      setState((previous) => ({
        ...previous,
        copied: false,
        errorMessage: "복사하지 못했습니다. 초대 링크를 직접 복사해 주세요.",
      }));
      return false;
    }
  }, [state.inviteUrl]);

  const resetRoom = useCallback(() => {
    roomIdRef.current = null;
    pendingActionRef.current = null;
    setState(initialState);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    roomIdRef.current = state.room?.id ?? null;
  }, [state.room?.id]);

  useEffect(() => {
    if (!roomId) return;
    if (autoJoinRoomIdRef.current === roomId) return;
    autoJoinRoomIdRef.current = roomId;
    joinRoom(roomId);
  }, [joinRoom, roomId]);

  useEffect(() => {
    if (state.status !== ONLINE_ROOM_LOAD_STATUS.READY || !state.room?.id) return undefined;
    const intervalId = window.setInterval(() => {
      refreshRoom();
    }, ONLINE_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshRoom, state.room?.id, state.status]);

  return {
    ...state,
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
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    setGuidePreferences,
    updateRoomSettings,
    startRoom,
    submitMove,
    requestRematch,
    cancelRematch,
    acceptRematch,
    copyInviteUrl,
    resetRoom,
    saveNicknameAndResume,
  };
}
