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

function getMenuOptionButtons(container) {
  return Array.from(container.querySelectorAll(".omok-game__menu-option"));
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

  it("shows exactly the four required menu entries and nothing else", () => {
    const view = renderOmokGame();

    const options = getMenuOptionButtons(view.container);
    expect(options).toHaveLength(4);
    expect(findButtonByText(view.container, "게임 나가기")).not.toBeNull();

    const titles = options.map((button) => button.querySelector(".omok-game__menu-title").textContent);
    expect(titles[0]).toContain("빠른 대전");
    expect(titles[1]).toContain("친구 초대");
    expect(titles[2]).toContain("컴퓨터 대전");
    expect(titles[3]).toContain("게임 설정");

    expect(view.container.textContent).not.toContain("로컬 2인");
    expect(view.container.textContent).not.toContain("공개방");
    expect(view.container.textContent).not.toContain("방 목록");
    expect(view.container.textContent).toContain("Match");
    expect(view.container.textContent).toContain("—");
    expect(view.container.textContent).not.toContain("Computer match");
    expect(view.container.textContent).not.toContain("Moves0");
    expect([...view.container.querySelectorAll(".omok-game__rule-summary-text > span")].map((node) => node.textContent)).toEqual([
      "Standard Omok",
      "금수 도움 사용 중",
    ]);

    view.unmount();
  });

  it("keeps 빠른 대전 disabled with a Soon badge", () => {
    const view = renderOmokGame();
    const [quickMatchButton] = getMenuOptionButtons(view.container);

    expect(quickMatchButton.disabled).toBe(true);
    expect(quickMatchButton.textContent).toContain("준비 중");

    view.unmount();
  });

  it("shows computer setup before the board and starts only after confirmation", async () => {
    const view = renderOmokGame();
    const computerButton = findButtonByText(view.container, "컴퓨터 대전");

    await view.click(computerButton);

    expect(view.container.textContent).toContain("컴퓨터 대전 설정");
    expect(findButtonByText(view.container, "금수 위치")).not.toBeNull();
    expect(findButtonByText(view.container, "금수 이유")).not.toBeNull();
    expect(view.container.textContent).not.toContain("금수 위치 표시");
    expect(view.container.textContent).not.toContain("금수 이유 설명");
    expect(view.container.querySelector(".omok-game__board")).toBeNull();
    await view.click(findButtonByText(view.container, "게임 시작"));
    expect(view.container.querySelector(".omok-game__board")).not.toBeNull();
    expect(document.body.textContent).toContain("대국을 시작합니다");
    expect(document.querySelector('[data-doodle-variant="start"]')).not.toBeNull();
    expect(mockGateway.createRoom).not.toHaveBeenCalled();
    expect(mockGateway.joinRoom).not.toHaveBeenCalled();
    expect(mockGateway.getCurrentProfileState).not.toHaveBeenCalled();

    view.unmount();
  });

  it("hides forbidden-move options completely in Free Omok", async () => {
    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "컴퓨터 대전"));

    expect(view.container.querySelectorAll(".omok-game__setting-toggle")).toHaveLength(2);
    await view.click(findButtonByExactText(view.container, "Free Omok"));
    expect(view.container.querySelectorAll(".omok-game__setting-toggle")).toHaveLength(0);

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
    mockGateway.updateRoomSettings.mockImplementation(async (settings) => ({
      inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
      moves: [],
      room: createRoomFixture(settings),
      userId: "host",
    }));

    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "친구 초대"));

    const allowPositionsToggle = Array.from(view.container.querySelectorAll(".omok-game__setting-toggle"))
      .find((button) => button.textContent.includes("금수 위치 허용"));
    await view.click(allowPositionsToggle);
    expect(view.container.querySelector(".omok-game__board")).toBeNull();
    expect(view.container.textContent).not.toContain("Easy");
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

    const centerIntersection = view.container.querySelectorAll(".omok-game__intersection")[7 * 15 + 7];
    await view.click(centerIntersection);
    expect(view.container.querySelector(".omok-game__stone")).not.toBeNull();

    await view.click(findButtonByExactText(view.container, "게임 나가기"));
    expect(document.body.textContent).toContain("게임 중 메뉴로 나갈까요?");

    await view.click(findButtonByText(view.container, "계속 두기"));
    expect(document.body.textContent).not.toContain("게임 중 메뉴로 나갈까요?");
    expect(view.container.querySelector(".omok-game__stone")).not.toBeNull();

    await view.click(findButtonByExactText(view.container, "게임 나가기"));
    await view.click(findButtonByText(view.container, "메뉴로 나가기"));
    expect(view.container.querySelector(".omok-game__lobby")).not.toBeNull();
    expect(view.container.querySelector(".omok-game__board")).toBeNull();

    view.unmount();
  });

  it("keeps only the shared game-exit action during a computer match", async () => {
    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "컴퓨터 대전"));
    await view.click(findButtonByText(view.container, "게임 시작"));
    await view.click(findButtonByText(view.container, "시작"));

    expect(findButtonByExactText(view.container, "게임 나가기")).not.toBeNull();
    expect(findButtonByExactText(view.container, "기권")).toBeNull();
    expect(findButtonByExactText(view.container, "규칙")).toBeNull();
    expect(findButtonByExactText(view.container, "메뉴")).toBeNull();

    view.unmount();
  });

  it("does not start the computer timer before the start modal is completed", async () => {
    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "컴퓨터 대전"));
    await view.click(findButtonByExactText(view.container, "White"));
    await view.click(findButtonByText(view.container, "게임 시작"));

    expect(view.container.querySelectorAll(".omok-game__stone")).toHaveLength(0);
    await act(async () => {
      vi.runOnlyPendingTimers();
      await flushMicrotasks();
    });
    expect(view.container.querySelectorAll(".omok-game__stone")).toHaveLength(0);

    await view.click(findButtonByText(view.container, "시작"));
    await act(async () => {
      vi.runOnlyPendingTimers();
      await flushMicrotasks();
    });
    expect(view.container.querySelectorAll(".omok-game__stone")).toHaveLength(1);
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

  it("lets the host edit shared settings while the guest only sees a read-only summary", async () => {
    mockGateway.createRoom.mockResolvedValue({
      inviteUrl: `http://localhost/#/minigames/omok/room/${roomId}`,
      moves: [],
      room: createRoomFixture(),
      userId: "host",
    });

    const view = renderOmokGame();
    await view.click(findButtonByText(view.container, "친구 초대"));
    expect(view.container.querySelector(".omok-game__board")).toBeNull();
    await view.click(findButtonByText(view.container, "방 만들기"));

    expect(view.container.textContent).toContain("공유 방 규칙");
    expect(view.container.querySelectorAll(".omok-game__setting-chip").length).toBeGreaterThan(0);
    await view.click(view.container.querySelector('.omok-game__rule-panel [aria-label="규칙 자세히 보기"]'));
    expect(document.body.textContent).toContain("방장 금수 안내");
    expect(document.body.textContent).toContain("참가자 금수 안내");
    await view.click(findButtonByText(view.container, "확인"));

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

    expect(guestView.container.textContent).toContain("공유 방 규칙");
    expect(guestView.container.querySelectorAll(".omok-game__rule-panel .omok-game__setting-chip").length).toBe(0);

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
    expect(view.container.querySelector(".omok-game__board")).not.toBeNull();
    const firstIntersection = view.container.querySelector(".omok-game__intersection");
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

    expect(document.body.textContent).not.toContain("재대결 요청");
    expect(document.body.textContent).not.toContain("수락");

    const rematchButton = findButtonByText(view.container, "한 판 더");
    expect(rematchButton).not.toBeNull();
    expect(rematchButton.disabled).toBe(false);
    expect(document.querySelector('[data-doodle-variant="record"]')).not.toBeNull();

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
