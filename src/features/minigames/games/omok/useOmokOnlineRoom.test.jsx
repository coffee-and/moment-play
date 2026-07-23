// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OMOK_MODE, STONE } from "./omok.constants.js";
import { ONLINE_ACTION_STATUS, ONLINE_POLL_INTERVAL_MS } from "./online/omokOnline.constants.js";
import { useOmokOnlineRoom } from "./useOmokOnlineRoom.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const roomId = "11111111-1111-4111-8111-111111111111";
const winningMoves = [
  { id: "m0", moveNumber: 0, position: { row: 7, col: 3 }, roundNumber: 1, stone: STONE.BLACK },
  { id: "m1", moveNumber: 1, position: { row: 0, col: 0 }, roundNumber: 1, stone: STONE.WHITE },
  { id: "m2", moveNumber: 2, position: { row: 7, col: 4 }, roundNumber: 1, stone: STONE.BLACK },
  { id: "m3", moveNumber: 3, position: { row: 0, col: 1 }, roundNumber: 1, stone: STONE.WHITE },
  { id: "m4", moveNumber: 4, position: { row: 7, col: 5 }, roundNumber: 1, stone: STONE.BLACK },
  { id: "m5", moveNumber: 5, position: { row: 0, col: 2 }, roundNumber: 1, stone: STONE.WHITE },
  { id: "m6", moveNumber: 6, position: { row: 7, col: 6 }, roundNumber: 1, stone: STONE.BLACK },
  { id: "m7", moveNumber: 7, position: { row: 0, col: 3 }, roundNumber: 1, stone: STONE.WHITE },
  { id: "m8", moveNumber: 8, position: { row: 7, col: 7 }, roundNumber: 1, stone: STONE.BLACK },
];

function createRoom(overrides = {}) {
  return {
    allowForbiddenPositions: true,
    allowForbiddenReasons: true,
    currentRound: 1,
    gameMode: OMOK_MODE.STANDARD,
    hostUserId: "host",
    id: roomId,
    players: [
      {
        explainForbiddenReasons: true,
        nickname: "Host",
        ready: false,
        role: "host",
        showForbiddenPositions: true,
        userId: "host",
      },
    ],
    roundRequestedBy: null,
    status: "waiting",
    title: "Host님의 방",
    ...overrides,
  };
}

function createGateway(overrides = {}) {
  const baseRoom = createRoom();
  return {
    acceptRematch: vi.fn(async () => ({ moves: [], room: createRoom({ currentRound: 2, players: fullPlayers(), status: "playing" }) })),
    cancelRematch: vi.fn(async () => ({ moves: [], room: createRoom({ players: fullPlayers(), roundRequestedBy: null, status: "playing" }) })),
    createRoom: vi.fn(async () => ({ inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`, moves: [], room: baseRoom, userId: "host" })),
    getCurrentProfileState: vi.fn(async () => ({ needsNicknameSetup: false, nickname: "Host", userId: "host" })),
    isConfigured: vi.fn(() => true),
    joinRoom: vi.fn(async () => ({ inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`, moves: [], room: createRoom({ players: fullPlayers() }), userId: "guest" })),
    leaveRoom: vi.fn(async () => undefined),
    refreshRoom: vi.fn(async () => ({ moves: [], room: baseRoom })),
    requestRematch: vi.fn(async () => ({ moves: [], room: createRoom({ players: fullPlayers(), roundRequestedBy: "host", status: "playing" }) })),
    saveCurrentProfileNickname: vi.fn(async (nickname) => ({ needsNicknameSetup: false, nickname, userId: "host" })),
    setGuidePreferences: vi.fn(async () => ({ moves: [], room: baseRoom })),
    setReady: vi.fn(async (_roomId, ready) => ({ moves: [], room: createRoom({ players: [{ ...baseRoom.players[0], ready }] }) })),
    startRoom: vi.fn(async () => ({ moves: [], room: createRoom({ players: fullPlayers(true), status: "playing" }) })),
    submitMove: vi.fn(async () => ({
      moves: [{ id: "move-0", moveNumber: 0, position: { row: 7, col: 7 }, roundNumber: 1, stone: STONE.BLACK }],
      room: createRoom({ players: fullPlayers(true), status: "playing" }),
    })),
    updateRoomSettings: vi.fn(async () => ({ moves: [], room: baseRoom })),
    ...overrides,
  };
}

function fullPlayers(ready = false) {
  return [
    {
      explainForbiddenReasons: true,
      nickname: "Host",
      ready,
      role: "host",
      showForbiddenPositions: true,
      userId: "host",
    },
    {
      explainForbiddenReasons: true,
      nickname: "Guest",
      ready,
      role: "guest",
      showForbiddenPositions: true,
      userId: "guest",
    },
  ];
}

function renderUseOmokOnlineRoom(options = {}, renderOptions = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let current;

  function Harness({ hookOptions }) {
    current = useOmokOnlineRoom(hookOptions);
    return null;
  }

  function renderHarness(hookOptions) {
    const harness = <Harness hookOptions={hookOptions} />;
    return renderOptions.strict ? <React.StrictMode>{harness}</React.StrictMode> : harness;
  }

  act(() => {
    root.render(renderHarness(options));
  });

  return {
    get current() {
      return current;
    },
    rerender(nextOptions) {
      act(() => {
        root.render(renderHarness(nextOptions));
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("useOmokOnlineRoom", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("reports online unavailable without Supabase configuration", async () => {
    const gateway = createGateway({ isConfigured: vi.fn(() => false) });
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true } });
    });

    expect(hook.current.errorMessage).toMatch(/Supabase/);
    expect(gateway.createRoom).not.toHaveBeenCalled();
    hook.unmount();
  });

  it("creates a room after reusing an existing custom nickname", async () => {
    const gateway = createGateway();
    const navigateToRoom = vi.fn();
    const hook = renderUseOmokOnlineRoom({ gateway, onNavigateToRoom: navigateToRoom });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true } });
    });

    expect(gateway.getCurrentProfileState).toHaveBeenCalledTimes(1);
    expect(gateway.createRoom).toHaveBeenCalledTimes(1);
    expect(hook.current.room.id).toBe(roomId);
    expect(navigateToRoom).toHaveBeenCalledWith(roomId);
    hook.unmount();
  });

  it("pauses for nickname setup and resumes the pending create action once", async () => {
    const gateway = createGateway({
      getCurrentProfileState: vi.fn(async () => ({ needsNicknameSetup: true, nickname: null, userId: "host" })),
    });
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true } });
    });

    expect(hook.current.needsNicknameSetup).toBe(true);
    expect(gateway.createRoom).not.toHaveBeenCalled();

    await act(async () => {
      await hook.current.saveNicknameAndResume("  New   Host  ");
    });

    expect(gateway.saveCurrentProfileNickname).toHaveBeenCalledWith("New Host");
    expect(gateway.createRoom).toHaveBeenCalledTimes(1);
    hook.unmount();
  });

  it("keeps needsNicknameSetup on a save failure, clears the pending action status, and shows the error - without resuming the room flow", async () => {
    const gateway = createGateway({
      getCurrentProfileState: vi.fn(async () => ({ needsNicknameSetup: true, nickname: null, userId: "host" })),
      saveCurrentProfileNickname: vi.fn(async () => {
        throw new Error("닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }),
    });
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true } });
    });
    expect(hook.current.needsNicknameSetup).toBe(true);

    await act(async () => {
      await hook.current.saveNicknameAndResume("New Host");
    });

    expect(hook.current.needsNicknameSetup).toBe(true);
    expect(hook.current.actionStatus).toBe(ONLINE_ACTION_STATUS.IDLE);
    expect(hook.current.errorMessage).toMatch(/저장하지 못했어요/);
    expect(gateway.createRoom).not.toHaveBeenCalled();
    hook.unmount();
  });

  it("blocks a duplicate confirmation while a nickname save is already pending", async () => {
    let resolveSave;
    const gateway = createGateway({
      getCurrentProfileState: vi.fn(async () => ({ needsNicknameSetup: true, nickname: null, userId: "host" })),
      saveCurrentProfileNickname: vi.fn(() => new Promise((resolve) => {
        resolveSave = resolve;
      })),
    });
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true } });
    });

    act(() => {
      hook.current.saveNicknameAndResume("New Host");
    });
    expect(hook.current.actionStatus).toBe(ONLINE_ACTION_STATUS.SAVING_NICKNAME);

    // A second Confirm click while the first save is still in flight.
    await act(async () => {
      await hook.current.saveNicknameAndResume("New Host");
    });
    expect(gateway.saveCurrentProfileNickname).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave({ needsNicknameSetup: false, nickname: "New Host", userId: "host" });
    });
    hook.unmount();
  });

  it("rejects malformed invite room IDs before calling the gateway", async () => {
    const gateway = createGateway();
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.joinRoom("not-a-room");
    });

    expect(hook.current.errorMessage).toMatch(/방 ID/);
    expect(gateway.joinRoom).not.toHaveBeenCalled();
    hook.unmount();
  });

  it("joins an existing room and maps guest to white", async () => {
    const gateway = createGateway();
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.joinRoom(roomId);
    });

    expect(hook.current.currentPlayer.role).toBe("guest");
    expect(hook.current.playerStone).toBe(STONE.WHITE);
    hook.unmount();
  });

  it("auto-joins an invite room only once in StrictMode", async () => {
    const gateway = createGateway();
    const hook = renderUseOmokOnlineRoom({ gateway, roomId }, { strict: true });

    await act(async () => {});

    expect(gateway.joinRoom).toHaveBeenCalledTimes(1);
    expect(hook.current.room.id).toBe(roomId);
    hook.unmount();
  });

  it("blocks out-of-turn user moves before calling the gateway", async () => {
    const gateway = createGateway({
      joinRoom: vi.fn(async () => ({
        inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
        moves: [],
        room: createRoom({ players: fullPlayers(true), status: "playing" }),
        userId: "guest",
      })),
    });
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.joinRoom(roomId);
    });
    await act(async () => {
      expect(await hook.current.submitMove({ row: 7, col: 7 })).toBe(false);
    });

    expect(hook.current.playerStone).toBe(STONE.WHITE);
    expect(hook.current.canSubmitMove).toBe(false);
    expect(gateway.submitMove).not.toHaveBeenCalled();
    hook.unmount();
  });

  it("detects opponent-left state and blocks moves", async () => {
    const gateway = createGateway({
      createRoom: vi.fn(async () => ({
        inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
        moves: [],
        room: createRoom({ players: [fullPlayers(true)[0]], status: "playing" }),
        userId: "host",
      })),
    });
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true } });
    });

    expect(hook.current.opponentLeft).toBe(true);
    expect(hook.current.canSubmitMove).toBe(false);
    hook.unmount();
  });

  it("sets ready, starts, submits a valid move, and blocks duplicate submit while pending", async () => {
    let releaseMove;
    const movePromise = new Promise((resolve) => {
      releaseMove = () => resolve({
        moves: [{ id: "move-0", moveNumber: 0, position: { row: 7, col: 7 }, roundNumber: 1, stone: STONE.BLACK }],
        room: createRoom({ players: fullPlayers(true), status: "playing" }),
      });
    });
    const gateway = createGateway({
      submitMove: vi.fn(() => movePromise),
    });
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true } });
    });
    await act(async () => {
      await hook.current.setReady(true);
    });
    await act(async () => {
      await hook.current.startRoom();
    });

    expect(hook.current.room.status).toBe("playing");

    let firstSubmit;
    act(() => {
      firstSubmit = hook.current.submitMove({ row: 7, col: 7 });
    });

    expect(hook.current.canSubmitMove).toBe(false);
    await act(async () => {
      expect(await hook.current.submitMove({ row: 7, col: 8 })).toBe(false);
      releaseMove();
      expect(await firstSubmit).toBe(true);
    });

    expect(gateway.submitMove).toHaveBeenCalledTimes(1);
    expect(hook.current.derivedGame.board[7][7]).toBe(STONE.BLACK);
    hook.unmount();
  });

  it("polls without overlapping refresh calls and cleans up on unmount", async () => {
    let releaseRefresh;
    const refreshPromise = new Promise((resolve) => {
      releaseRefresh = () => resolve({ moves: [], room: createRoom() });
    });
    const gateway = createGateway({ refreshRoom: vi.fn(() => refreshPromise) });
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true } });
    });

    act(() => {
      vi.advanceTimersByTime(ONLINE_POLL_INTERVAL_MS * 2);
    });

    expect(gateway.refreshRoom).toHaveBeenCalledTimes(1);
    hook.unmount();

    await act(async () => {
      releaseRefresh();
      vi.advanceTimersByTime(ONLINE_POLL_INTERVAL_MS * 2);
    });

    expect(gateway.refreshRoom).toHaveBeenCalledTimes(1);
  });

  it("ignores stale polling snapshots for another room", async () => {
    const otherRoom = createRoom({ id: "22222222-2222-4222-8222-222222222222" });
    let releaseRefresh;
    const refreshPromise = new Promise((resolve) => {
      releaseRefresh = () => resolve({ moves: [], room: otherRoom });
    });
    const gateway = createGateway({ refreshRoom: vi.fn(() => refreshPromise) });
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true } });
    });
    act(() => {
      vi.advanceTimersByTime(ONLINE_POLL_INTERVAL_MS);
    });
    await act(async () => {
      releaseRefresh();
      await refreshPromise;
    });

    expect(hook.current.room.id).toBe(roomId);
    hook.unmount();
  });

  it("keeps the winning move when an older same-room poll finishes after move submission", async () => {
    let releaseRefresh;
    const staleRefresh = new Promise((resolve) => {
      releaseRefresh = () => resolve({
        moves: winningMoves.slice(0, -1),
        room: createRoom({ players: fullPlayers(true), status: "playing" }),
      });
    });
    const gateway = createGateway({
      createRoom: vi.fn(async () => ({
        inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
        moves: winningMoves.slice(0, -1),
        room: createRoom({ players: fullPlayers(true), status: "playing" }),
        userId: "host",
      })),
      refreshRoom: vi.fn(() => staleRefresh),
      submitMove: vi.fn(async () => ({
        moves: winningMoves,
        room: createRoom({ players: fullPlayers(true), status: "playing" }),
      })),
    });
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true } });
    });
    act(() => {
      vi.advanceTimersByTime(ONLINE_POLL_INTERVAL_MS);
    });
    await act(async () => {
      expect(await hook.current.submitMove({ row: 7, col: 7 })).toBe(true);
    });
    expect(hook.current.derivedGame.winner).toBe(STONE.BLACK);

    await act(async () => {
      releaseRefresh();
      await staleRefresh;
    });

    expect(hook.current.derivedGame.winner).toBe(STONE.BLACK);
    expect(hook.current.moves).toHaveLength(winningMoves.length);
    hook.unmount();
  });

  it("handles rematch request, cancel, accept, and leave", async () => {
    const gateway = createGateway({
      createRoom: vi.fn(async () => ({
        inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
        moves: [],
        room: createRoom({ players: fullPlayers(true), status: "playing" }),
        userId: "host",
      })),
    });
    const navigateToLobby = vi.fn();
    const hook = renderUseOmokOnlineRoom({ gateway, onNavigateToLobby: navigateToLobby });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true } });
    });
    await act(async () => {
      await hook.current.requestRematch();
    });
    await act(async () => {
      await hook.current.cancelRematch();
    });
    await act(async () => {
      await hook.current.acceptRematch();
    });
    await act(async () => {
      await hook.current.leaveRoom();
    });

    expect(gateway.requestRematch).toHaveBeenCalledTimes(1);
    expect(gateway.cancelRematch).toHaveBeenCalledTimes(1);
    expect(gateway.acceptRematch).toHaveBeenCalledTimes(1);
    expect(gateway.leaveRoom).toHaveBeenCalledTimes(1);
    expect(navigateToLobby).toHaveBeenCalledTimes(1);
    expect(hook.current.room).toBeNull();
    hook.unmount();
  });

  it("gates effective guide permissions by the room-level allow settings", async () => {
    const gateway = createGateway({
      createRoom: vi.fn(async () => ({
        inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
        moves: [],
        room: createRoom({ allowForbiddenPositions: false, allowForbiddenReasons: true }),
        userId: "host",
      })),
    });
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true }, roomGuideSettings: { allowForbiddenPositions: false, allowForbiddenReasons: true } });
    });

    expect(hook.current.effectiveShowForbiddenPositions).toBe(false);
    expect(hook.current.effectiveExplainForbiddenReasons).toBe(true);
    hook.unmount();
  });

  it("disables every effective guide permission in Free mode even when allowed and enabled", async () => {
    const gateway = createGateway({
      createRoom: vi.fn(async () => ({
        inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
        moves: [],
        room: createRoom({ allowForbiddenPositions: true, allowForbiddenReasons: true, gameMode: OMOK_MODE.FREE }),
        userId: "host",
      })),
    });
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.FREE, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true }, roomGuideSettings: { allowForbiddenPositions: true, allowForbiddenReasons: true } });
    });

    expect(hook.current.effectiveShowForbiddenPositions).toBe(false);
    expect(hook.current.effectiveExplainForbiddenReasons).toBe(false);
    hook.unmount();
  });

  it("calls the room-settings RPC gateway with the submitted shared values", async () => {
    const gateway = createGateway();
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true }, roomGuideSettings: { allowForbiddenPositions: true, allowForbiddenReasons: true } });
    });
    await act(async () => {
      await hook.current.updateRoomSettings({ allowForbiddenPositions: false, allowForbiddenReasons: true, gameMode: OMOK_MODE.STANDARD });
    });

    expect(gateway.updateRoomSettings).toHaveBeenCalledWith(roomId, { allowForbiddenPositions: false, allowForbiddenReasons: true, gameMode: OMOK_MODE.STANDARD });
    hook.unmount();
  });

  it("calls the per-player guide-preference RPC gateway with the submitted values", async () => {
    const gateway = createGateway();
    const hook = renderUseOmokOnlineRoom({ gateway });

    await act(async () => {
      await hook.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true }, roomGuideSettings: { allowForbiddenPositions: true, allowForbiddenReasons: true } });
    });
    await act(async () => {
      await hook.current.setGuidePreferences({ explainForbiddenReasons: false, showForbiddenPositions: true });
    });

    expect(gateway.setGuidePreferences).toHaveBeenCalledWith(roomId, { explainForbiddenReasons: false, showForbiddenPositions: true });
    hook.unmount();
  });

  it("labels a rejected forbidden move only when the effective explain permission is enabled", async () => {
    const doubleThreeMoves = [
      { id: "m0", moveNumber: 0, position: { row: 7, col: 6 }, roundNumber: 1, stone: STONE.BLACK },
      { id: "m1", moveNumber: 1, position: { row: 0, col: 0 }, roundNumber: 1, stone: STONE.WHITE },
      { id: "m2", moveNumber: 2, position: { row: 7, col: 8 }, roundNumber: 1, stone: STONE.BLACK },
      { id: "m3", moveNumber: 3, position: { row: 0, col: 1 }, roundNumber: 1, stone: STONE.WHITE },
      { id: "m4", moveNumber: 4, position: { row: 6, col: 7 }, roundNumber: 1, stone: STONE.BLACK },
      { id: "m5", moveNumber: 5, position: { row: 0, col: 2 }, roundNumber: 1, stone: STONE.WHITE },
      { id: "m6", moveNumber: 6, position: { row: 8, col: 7 }, roundNumber: 1, stone: STONE.BLACK },
      { id: "m7", moveNumber: 7, position: { row: 0, col: 3 }, roundNumber: 1, stone: STONE.WHITE },
    ];

    const gatewayReasonHidden = createGateway({
      createRoom: vi.fn(async () => ({
        inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
        moves: doubleThreeMoves,
        room: createRoom({ allowForbiddenReasons: false, players: fullPlayers(true), status: "playing" }),
        userId: "host",
      })),
    });
    const hookHidden = renderUseOmokOnlineRoom({ gateway: gatewayReasonHidden });
    await act(async () => {
      await hookHidden.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true }, roomGuideSettings: { allowForbiddenPositions: true, allowForbiddenReasons: false } });
    });
    await act(async () => {
      expect(await hookHidden.current.submitMove({ row: 7, col: 7 })).toBe(false);
    });
    expect(hookHidden.current.errorMessage).toBe("둘 수 없는 자리입니다.");
    hookHidden.unmount();

    const gatewayReasonShown = createGateway({
      createRoom: vi.fn(async () => ({
        inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
        moves: doubleThreeMoves,
        room: createRoom({ allowForbiddenReasons: true, players: fullPlayers(true), status: "playing" }),
        userId: "host",
      })),
    });
    const hookShown = renderUseOmokOnlineRoom({ gateway: gatewayReasonShown });
    await act(async () => {
      await hookShown.current.createRoom({ gameMode: OMOK_MODE.STANDARD, guideSettings: { explainForbiddenReasons: true, showForbiddenPositions: true }, roomGuideSettings: { allowForbiddenPositions: true, allowForbiddenReasons: true } });
    });
    await act(async () => {
      expect(await hookShown.current.submitMove({ row: 7, col: 7 })).toBe(false);
    });
    expect(hookShown.current.errorMessage).toBe("쌍삼 자리입니다.");
    hookShown.unmount();
  });
});
