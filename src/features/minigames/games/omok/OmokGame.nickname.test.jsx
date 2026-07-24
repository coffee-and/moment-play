// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OMOK_MODE, STONE } from "./omok.constants.js";
import { ONLINE_ACTION_STATUS, ONLINE_ROOM_LOAD_STATUS, ONLINE_ROOM_STATUS } from "./online/omokOnline.constants.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let onlineState;

vi.mock("./useOmokOnlineRoom.js", () => ({
  useOmokOnlineRoom: () => onlineState,
}));

vi.mock("./useOmokGame.js", () => ({
  useOmokGame: () => ({
    board: Array.from({ length: 15 }, () => Array(15).fill(null)),
    turn: STONE.BLACK,
    lastMove: null,
    winner: null,
    winningLine: [],
    moveCount: 0,
    draw: false,
    resultReason: null,
    forbiddenFeedback: null,
    forbiddenPositionKeys: new Set(),
    isComputerThinking: false,
    playUserMove: vi.fn(),
    restartGame: vi.fn(),
  }),
}));

vi.mock("./online/sharedNickname.js", () => ({
  GUEST_FALLBACK_NICKNAME: "Guest",
  getNicknamePrefillForOnlineSetup: () => "",
  resolveSharedNickname: async () => "LocalNick",
  saveLocalSharedNickname: (value) => value,
  saveSharedNickname: async (value) => value,
}));

vi.mock("../../shared/components/GameStage.jsx", () => ({
  GameStage: ({ sidebar, children }) => <div><aside>{sidebar}</aside><main>{children}</main></div>,
}));

vi.mock("../../shared/components/GameStageOverlay.jsx", () => ({
  GameStageOverlay: ({ children }) => <div>{children}</div>,
  GameStageModal: ({ children }) => <div>{children}</div>,
}));

const { OmokGame } = await import("./OmokGame.jsx");

function createOnlineState(overrides = {}) {
  return {
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
    currentPlayer: null,
    derivedGame: {
      board: Array.from({ length: 15 }, () => Array(15).fill(null)),
      turn: STONE.BLACK,
      lastMove: null,
      winner: null,
      winningLine: [],
      moveCount: 0,
      draw: false,
      resultReason: null,
      valid: true,
      errorMessage: null,
    },
    effectiveExplainForbiddenReasons: true,
    effectiveShowForbiddenPositions: true,
    forbiddenPositionKeys: new Set(),
    opponent: null,
    opponentLeft: false,
    playerStone: STONE.BLACK,
    canSubmitMove: false,
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    setReady: vi.fn(),
    setGuidePreferences: vi.fn(),
    updateRoomSettings: vi.fn(),
    startRoom: vi.fn(),
    submitMove: vi.fn(),
    requestRematch: vi.fn(),
    cancelRematch: vi.fn(),
    acceptRematch: vi.fn(),
    copyInviteUrl: vi.fn(),
    resetRoom: vi.fn(),
    saveNicknameAndResume: vi.fn(),
    ...overrides,
  };
}

async function renderGame({ roomId = null } = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<MemoryRouter><OmokGame roomId={roomId} /></MemoryRouter>);
  });
  return {
    host,
    async click(label) {
      const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent.includes(label));
      if (!button) throw new Error(`Button not found: ${label}`);
      await act(async () => button.click());
    },
    unmount() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

beforeEach(() => {
  onlineState = createOnlineState();
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("Omok nickname editing policy", () => {
  it("allows nickname editing before a match starts", async () => {
    const view = await renderGame();
    expect(view.host.querySelector("#omok-nickname").readOnly).toBe(false);
    view.unmount();
  });

  it("shows the server room nickname and locks editing in an online waiting room", async () => {
    const currentPlayer = {
      explainForbiddenReasons: true,
      nickname: "ServerNick",
      ready: false,
      role: "host",
      showForbiddenPositions: true,
      userId: "host-user",
    };
    onlineState = createOnlineState({
      status: ONLINE_ROOM_LOAD_STATUS.READY,
      currentUserId: "host-user",
      currentPlayer,
      profileNickname: "ServerNick",
      room: {
        id: "11111111-1111-4111-8111-111111111111",
        title: "ServerNick님의 방",
        gameMode: OMOK_MODE.STANDARD,
        allowForbiddenPositions: true,
        allowForbiddenReasons: true,
        status: ONLINE_ROOM_STATUS.WAITING,
        currentRound: 1,
        roundRequestedBy: null,
        players: [currentPlayer],
      },
    });

    const view = await renderGame({ roomId: onlineState.room.id });
    const input = view.host.querySelector("#omok-nickname");
    expect(input.value).toBe("ServerNick");
    expect(input.readOnly).toBe(true);
    view.unmount();
  });

  it("locks the nickname once a computer match reaches the start screen", async () => {
    const view = await renderGame();
    await view.click("컴퓨터 대전");
    await view.click("게임 시작");

    expect(view.host.querySelector("#omok-nickname").readOnly).toBe(true);
    view.unmount();
  });
});
