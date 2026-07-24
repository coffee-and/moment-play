// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OMOK_MODE, STONE } from "./omok.constants.js";

vi.mock("../../../../infrastructure/supabase/supabaseClient.js", () => ({
  getSupabaseClient: () => {
    throw new Error("supabase client unavailable in tests");
  },
  getSupabaseConfigStatus: () => ({ isConfigured: false, missingPublishableKey: true, missingUrl: true }),
  isSupabaseConfigured: () => false,
}));

vi.mock("../../../../infrastructure/supabase/omokOnlineRoomGateway.js", () => ({
  getProfileByUserId: vi.fn(async () => null),
  omokOnlineRoomGateway: {
    acceptRematch: vi.fn(),
    cancelRematch: vi.fn(),
    createRoom: vi.fn(),
    getCurrentProfileState: vi.fn(),
    isConfigured: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    refreshRoom: vi.fn(),
    requestRematch: vi.fn(),
    saveCurrentProfileNickname: vi.fn(),
    setGuidePreferences: vi.fn(),
    setReady: vi.fn(),
    startRoom: vi.fn(),
    submitMove: vi.fn(),
    updateRoomSettings: vi.fn(),
  },
  saveCurrentProfileNickname: vi.fn(async (nickname) => nickname),
}));

const { omokOnlineRoomGateway: mockGateway } = await import("../../../../infrastructure/supabase/omokOnlineRoomGateway.js");
const { OmokGame } = await import("./OmokGame.jsx");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const roomId = "11111111-1111-4111-8111-111111111111";

function createRoomFixture(overrides = {}) {
  return {
    allowForbiddenPositions: true,
    allowForbiddenReasons: true,
    currentRound: 1,
    gameMode: OMOK_MODE.STANDARD,
    hostUserId: "host",
    id: roomId,
    players: [
      { explainForbiddenReasons: true, nickname: "Host", ready: false, role: "host", showForbiddenPositions: true, userId: "host" },
      { explainForbiddenReasons: true, nickname: "Guest", ready: false, role: "guest", showForbiddenPositions: true, userId: "guest" },
    ],
    roundRequestedBy: null,
    status: "waiting",
    title: "Host님의 방",
    ...overrides,
  };
}

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

async function flushMicrotasks(times = 8) {
  for (let index = 0; index < times; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
}

function renderOmokGame({ roomId: routeRoomId = null } = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter>
        <OmokGame roomId={routeRoomId} />
      </MemoryRouter>,
    );
  });

  return {
    container,
    async click(element) {
      await act(async () => {
        element.click();
        await flushMicrotasks();
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

function findButtonByText(container, text) {
  void container;
  return Array.from(document.querySelectorAll("button")).find((button) => button.textContent.includes(text)) ?? null;
}

function findButtonByExactText(container, text) {
  void container;
  return Array.from(document.querySelectorAll("button")).find((button) => button.textContent.trim() === text) ?? null;
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("OmokGame top-level menu", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGateway.isConfigured.mockReturnValue(true);
    mockGateway.getCurrentProfileState.mockResolvedValue({ needsNicknameSetup: false, nickname: "Host", userId: "host" });
    mockGateway.leaveRoom.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
  });

  it("shows computer setup before the board and starts only after confirmation", async () => {
    const view = renderOmokGame();
    const computerButton = findButtonByText(view.container, "컴퓨터 대전");

    await view.click(computerButton);

    expect(view.container.textContent).toContain("컴퓨터 대전 설정");
    expect(findButtonByText(view.container, "금수 위치")).not.toBeNull();
    expect(findButtonByText(view.container, "금수 이유")).not.toBeNull();
    expect(view.container.querySelector('[role="group"][aria-label="15x15 오목 보드"]')).toBeNull();
    await view.click(findButtonByText(view.container, "게임 시작"));
    expect(view.container.querySelector('[role="group"][aria-label="15x15 오목 보드"]')).not.toBeNull();
    expect(document.body.textContent).toContain("대국을 시작합니다");
    expect(mockGateway.createRoom).not.toHaveBeenCalled();
    expect(mockGateway.joinRoom).not.toHaveBeenCalled();
    expect(mockGateway.getCurrentProfileState).not.toHaveBeenCalled();

    view.unmount();
  });

  it("hides forbidden-move options completely in Free Omok", async () => {
    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "컴퓨터 대전"));

    expect(findButtonByExactText(view.container, "금수 위치ON")).not.toBeNull();
    expect(findButtonByExactText(view.container, "금수 이유ON")).not.toBeNull();
    await view.click(findButtonByExactText(view.container, "Free Omok"));
    expect(findButtonByExactText(view.container, "금수 위치ON")).toBeNull();
    expect(findButtonByExactText(view.container, "금수 이유ON")).toBeNull();

    view.unmount();
  });
});

describe("OmokGame settings menu", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGateway.isConfigured.mockReturnValue(true);
    mockGateway.getCurrentProfileState.mockResolvedValue({ needsNicknameSetup: false, nickname: "Host", userId: "host" });
  });

  afterEach(() => {
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
  });

  it("passes current rule settings and personal guide defaults when creating a friend room", async () => {
    mockGateway.createRoom.mockResolvedValue({
      inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
      moves: [],
      room: createRoomFixture({ players: [createRoomFixture().players[0]] }),
      userId: "host",
    });
    mockGateway.updateRoomSettings.mockImplementation(async (_targetRoomId, settings) => ({
      inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
      moves: [],
      room: createRoomFixture(settings),
      userId: "host",
    }));

    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "친구 초대"));

    const allowPositionsToggle = findButtonByExactText(view.container, "금수 위치 허용ON");
    await view.click(allowPositionsToggle);
    await view.click(findButtonByText(view.container, "방 만들기"));

    expect(mockGateway.createRoom).toHaveBeenCalledTimes(1);
    const payload = mockGateway.createRoom.mock.calls[0][0];
    expect(payload.gameMode).toBe(OMOK_MODE.STANDARD);
    expect(payload.roomGuideSettings).toEqual({ allowForbiddenPositions: false, allowForbiddenReasons: true });
    expect(payload.guideSettings).toEqual({ explainForbiddenReasons: true, showForbiddenPositions: true });

    view.unmount();
  });

  it("closes the nickname modal exactly once after a successful save and resumes room creation", async () => {
    mockGateway.getCurrentProfileState.mockResolvedValue({ needsNicknameSetup: true, nickname: null, userId: "host" });
    mockGateway.saveCurrentProfileNickname.mockResolvedValue({ needsNicknameSetup: false, nickname: "New Host", userId: "host" });
    mockGateway.createRoom.mockResolvedValue({
      inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
      moves: [],
      room: createRoomFixture({ players: [createRoomFixture().players[0]] }),
      userId: "host",
    });

    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "친구 초대"));
    await view.click(findButtonByText(view.container, "방 만들기"));

    expect(document.querySelector('[aria-labelledby="omok-online-nickname-title"]')).not.toBeNull();
    expect(mockGateway.createRoom).not.toHaveBeenCalled();

    await act(async () => {
      setInputValue(document.getElementById("omok-online-nickname"), "New Host");
      await flushMicrotasks();
    });
    await view.click(findButtonByText(view.container, "저장"));

    expect(mockGateway.saveCurrentProfileNickname).toHaveBeenCalledWith("New Host");
    expect(mockGateway.saveCurrentProfileNickname).toHaveBeenCalledTimes(1);
    expect(mockGateway.createRoom).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[aria-labelledby="omok-online-nickname-title"]')).toBeNull();

    view.unmount();
  });

  it("keeps the nickname modal open, stops the pending state, and shows the shared inline error on a save failure", async () => {
    mockGateway.getCurrentProfileState.mockResolvedValue({ needsNicknameSetup: true, nickname: null, userId: "host" });
    mockGateway.saveCurrentProfileNickname.mockRejectedValue(new Error("닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요."));

    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "친구 초대"));
    await view.click(findButtonByText(view.container, "방 만들기"));
    await act(async () => {
      setInputValue(document.getElementById("omok-online-nickname"), "New Host");
      await flushMicrotasks();
    });
    await view.click(findButtonByText(view.container, "저장"));

    expect(document.querySelector('[aria-labelledby="omok-online-nickname-title"]')).not.toBeNull();
    expect(document.body.textContent).toContain("닉네임을 저장하지 못했어요");
    expect(mockGateway.createRoom).not.toHaveBeenCalled();

    const saveButton = findButtonByText(view.container, "저장");
    expect(saveButton.disabled).toBe(false);
    expect(saveButton.textContent).toBe("저장");

    view.unmount();
  });
});

describe("OmokGame active-game leave confirmation (computer match)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0);
    mockGateway.isConfigured.mockReturnValue(true);
  });

  afterEach(() => {
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("confirms before returning to the menu once a move has been made, and cancelling preserves the game", async () => {
    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "컴퓨터 대전"));
    await view.click(findButtonByText(view.container, "게임 시작"));
    await view.click(findButtonByText(view.container, "시작"));

    const centerIntersection = view.container.querySelector('button[aria-label="8행 8열, 빈 교차점"]');
    await view.click(centerIntersection);
    expect(view.container.querySelector('button[aria-label="8행 8열, 흑돌"]')).not.toBeNull();

    await view.click(findButtonByExactText(view.container, "게임 나가기"));
    expect(document.body.textContent).toContain("게임 중 메뉴로 나갈까요?");

    await view.click(findButtonByText(view.container, "계속 두기"));
    expect(document.body.textContent).not.toContain("게임 중 메뉴로 나갈까요?");
    expect(view.container.querySelector('button[aria-label="8행 8열, 흑돌"]')).not.toBeNull();

    await view.click(findButtonByExactText(view.container, "게임 나가기"));
    await view.click(findButtonByText(view.container, "메뉴로 나가기"));
    expect(view.container.querySelector('[aria-label="오목 메뉴"]')).not.toBeNull();
    expect(view.container.querySelector('[role="group"][aria-label="15x15 오목 보드"]')).toBeNull();

    view.unmount();
  });

  it("does not start the computer timer before the start modal is completed", async () => {
    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "컴퓨터 대전"));
    await view.click(findButtonByExactText(view.container, "White"));
    await view.click(findButtonByText(view.container, "게임 시작"));

    expect(view.container.querySelector('button[aria-label="8행 8열, 흑돌"]')).toBeNull();
    await act(async () => {
      vi.runOnlyPendingTimers();
      await flushMicrotasks();
    });
    expect(view.container.querySelector('button[aria-label="8행 8열, 흑돌"]')).toBeNull();

    await view.click(findButtonByText(view.container, "시작"));
    await act(async () => {
      vi.runOnlyPendingTimers();
      await flushMicrotasks();
    });
    expect(view.container.querySelector('button[aria-label="8행 8열, 흑돌"]')).not.toBeNull();
    view.unmount();
  });
});

describe("OmokGame online waiting room", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGateway.isConfigured.mockReturnValue(true);
    mockGateway.getCurrentProfileState.mockResolvedValue({ needsNicknameSetup: false, nickname: "Host", userId: "host" });
    mockGateway.leaveRoom.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
  });

  it("lets only the host change shared room settings", async () => {
    mockGateway.createRoom.mockResolvedValue({
      inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
      moves: [],
      room: createRoomFixture(),
      userId: "host",
    });
    mockGateway.updateRoomSettings.mockImplementation(async (_targetRoomId, settings) => ({
      inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
      moves: [],
      room: createRoomFixture(settings),
      userId: "host",
    }));

    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "친구 초대"));
    await view.click(findButtonByText(view.container, "방 만들기"));
    await view.click(findButtonByExactText(view.container, "Free Omok"));
    expect(mockGateway.updateRoomSettings).toHaveBeenCalledWith(
      roomId,
      expect.objectContaining({ gameMode: OMOK_MODE.FREE }),
    );

    view.unmount();

    mockGateway.getCurrentProfileState.mockResolvedValue({ needsNicknameSetup: false, nickname: "Guest", userId: "guest" });
    mockGateway.joinRoom.mockResolvedValue({
      inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
      moves: [],
      room: createRoomFixture(),
      userId: "guest",
    });

    const guestView = renderOmokGame({ roomId });
    await act(async () => {
      await flushMicrotasks(12);
    });

    expect(guestView.container.querySelector('[role="group"][aria-label="오목 규칙"]')).toBeNull();

    guestView.unmount();
  });
});

describe("OmokGame active online game", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGateway.isConfigured.mockReturnValue(true);
    mockGateway.getCurrentProfileState.mockResolvedValue({ needsNicknameSetup: false, nickname: "Host", userId: "host" });
    mockGateway.leaveRoom.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
  });

  it("requires confirmation before leaving an active game and calls the leave RPC exactly once when confirmed", async () => {
    mockGateway.createRoom.mockResolvedValue({
      inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
      moves: [],
      room: createRoomFixture({ status: "playing" }),
      userId: "host",
    });

    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "친구 초대"));
    await view.click(findButtonByText(view.container, "방 만들기"));
    expect(view.container.querySelector('[role="group"][aria-label="15x15 오목 보드"]')).not.toBeNull();
    const firstIntersection = view.container.querySelector('button[aria-label="1행 1열, 빈 교차점"]');
    expect(firstIntersection.disabled).toBe(true);
    await view.click(firstIntersection);
    expect(mockGateway.submitMove).not.toHaveBeenCalled();
    await view.click(findButtonByText(view.container, "시작"));

    const leaveButton = findButtonByExactText(view.container, "게임 나가기");
    await view.click(leaveButton);
    expect(document.body.textContent).toContain("게임 중 방을 나갈까요?");
    expect(mockGateway.leaveRoom).not.toHaveBeenCalled();

    await view.click(findButtonByText(view.container, "계속 두기"));
    expect(document.body.textContent).not.toContain("게임 중 방을 나갈까요?");

    await view.click(findButtonByExactText(view.container, "게임 나가기"));
    await view.click(findButtonByExactText(view.container, "방 나가기"));
    expect(mockGateway.leaveRoom).toHaveBeenCalledTimes(1);

    view.unmount();
  });

  it("drives online rematch through a single 한 판 더 button", async () => {
    mockGateway.createRoom.mockResolvedValue({
      inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
      moves: winningMoves,
      room: createRoomFixture({ status: "playing" }),
      userId: "host",
    });

    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "친구 초대"));
    await view.click(findButtonByText(view.container, "방 만들기"));
    await view.click(findButtonByText(view.container, "시작"));

    const rematchButton = findButtonByText(view.container, "한 판 더");
    expect(rematchButton).not.toBeNull();
    expect(rematchButton.disabled).toBe(false);

    mockGateway.requestRematch.mockResolvedValue({
      moves: winningMoves,
      room: createRoomFixture({ roundRequestedBy: "host", status: "playing" }),
    });
    await view.click(rematchButton);

    expect(mockGateway.requestRematch).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("상대 응답을 기다리는 중입니다.");
    expect(findButtonByText(view.container, "한 판 더").disabled).toBe(true);

    view.unmount();
  });

  it("shows the loss result when an invited guest receives the opponent's winning move", async () => {
    mockGateway.getCurrentProfileState.mockResolvedValue({ needsNicknameSetup: false, nickname: "Guest", userId: "guest" });
    mockGateway.joinRoom.mockResolvedValue({
      inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
      moves: winningMoves.slice(0, -1),
      room: createRoomFixture({ players: createRoomFixture().players.map((player) => ({ ...player, ready: true })), status: "playing" }),
      userId: "guest",
    });
    mockGateway.refreshRoom.mockResolvedValue({
      moves: winningMoves,
      room: createRoomFixture({ players: createRoomFixture().players.map((player) => ({ ...player, ready: true })), status: "playing" }),
    });

    const view = renderOmokGame({ roomId });
    await act(async () => {
      await flushMicrotasks(12);
    });
    await view.click(findButtonByExactText(view.container, "시작"));
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await flushMicrotasks(12);
    });

    const resultDialog = document.querySelector('[aria-labelledby="omok-result-title"]');
    expect(resultDialog).not.toBeNull();
    expect(resultDialog.textContent).toContain("패배");
    expect(resultDialog.textContent).toContain("흑이 다섯 돌을 완성했습니다.");
    view.unmount();
  });

  it("routes result-room leaving through confirmation without reusing resign copy", async () => {
    mockGateway.createRoom.mockResolvedValue({
      inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
      moves: winningMoves,
      room: createRoomFixture({ status: "playing" }),
      userId: "host",
    });

    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "친구 초대"));
    await view.click(findButtonByText(view.container, "방 만들기"));
    await view.click(findButtonByText(view.container, "시작"));
    await view.click(findButtonByText(view.container, "방 나가기"));

    expect(document.body.textContent).toContain("방을 나갈까요?");
    expect(document.body.textContent).not.toContain("기권하면");
    expect(mockGateway.leaveRoom).not.toHaveBeenCalled();

    await view.click(findButtonByText(view.container, "방 나가기"));
    expect(mockGateway.leaveRoom).toHaveBeenCalledTimes(1);
    view.unmount();
  });
});
