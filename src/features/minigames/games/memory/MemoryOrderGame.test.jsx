// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../shared/auth/AuthContext.jsx", () => ({
  useAuth: () => ({ status: "guest", user: null }),
}));

import { MEMORY_SYMBOLS, MEMORY_TIMING, MemoryOrderGame } from "./MemoryOrderGame.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Round 1 fixed timings (see memoryOrder.logic.js): count 3, preview 6000ms,
// selection 6000ms. Countdown is always 4 steps of MEMORY_TIMING.COUNTDOWN_STEP_MS.
const COUNTDOWN_TOTAL_MS = MEMORY_TIMING.COUNTDOWN_STEP_MS * 4;
const ROUND_1_PREVIEW_MS = 6000;
const ROUND_1_SELECTION_MS = 6000;
const ROUND_1_PLAYER_TURN_START_MS = COUNTDOWN_TOTAL_MS + ROUND_1_PREVIEW_MS + MEMORY_TIMING.INPUT_GUIDE_DURATION_MS;

function findButton(text) {
  return Array.from(document.querySelectorAll("button")).find((button) => button.textContent.includes(text));
}

function getSequenceIds() {
  return Array.from(document.querySelectorAll(".memory-sequence__item"), (item) => item.dataset.symbolId);
}

function areCardsDisabled() {
  return Array.from(document.querySelectorAll(".memory-card")).every((button) => button.disabled);
}

function clickSequence(sequenceIds) {
  sequenceIds.forEach((symbolId) => {
    const symbol = MEMORY_SYMBOLS.find((item) => item.id === symbolId);
    const button = document.querySelector(`.memory-card[aria-label="${symbol.name} 선택"]`);
    act(() => button.click());
  });
}

function renderGame() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <MemoryRouter initialEntries={["/minigames/memory"]}>
        <Routes>
          <Route path="/" element={<div>Home route</div>} />
          <Route path="/minigames/memory" element={<MemoryOrderGame />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
  return { host, unmount: () => act(() => root.unmount()) };
}

describe("MemoryOrderGame transitions and exit flow", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
    document.body.innerHTML = "";
  });

  it("shows the input-guide overlay only after the sequence preview ends, and keeps card input disabled until it clears", () => {
    const view = renderGame();
    act(() => findButton("게임 시작").click());

    act(() => vi.advanceTimersByTime(COUNTDOWN_TOTAL_MS + ROUND_1_PREVIEW_MS));

    expect(document.body.textContent).toContain("YOUR TURN");
    expect(document.body.textContent).toContain("순서대로 선택하세요");
    expect(areCardsDisabled()).toBe(true);

    act(() => vi.advanceTimersByTime(MEMORY_TIMING.INPUT_GUIDE_DURATION_MS - 1));
    expect(document.body.textContent).toContain("YOUR TURN");
    expect(areCardsDisabled()).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(document.body.textContent).not.toContain("YOUR TURN");
    expect(areCardsDisabled()).toBe(false);

    view.unmount();
  });

  it("cannot select cards during countdown or sequence display", () => {
    const view = renderGame();
    act(() => findButton("게임 시작").click());
    expect(document.body.textContent).toContain("ROUND —");
    expect(areCardsDisabled()).toBe(true);

    act(() => vi.advanceTimersByTime(COUNTDOWN_TOTAL_MS));
    expect(document.body.textContent).not.toContain("YOUR TURN");
    expect(areCardsDisabled()).toBe(true);

    act(() => vi.advanceTimersByTime(ROUND_1_PREVIEW_MS - 1));
    expect(document.body.textContent).not.toContain("YOUR TURN");
    expect(areCardsDisabled()).toBe(true);

    view.unmount();
  });

  it("displays ROUND 1 CLEAR! and keeps it visible for its configured duration without advancing the round early", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const view = renderGame();
    act(() => findButton("게임 시작").click());
    const sequenceIds = getSequenceIds();

    act(() => vi.advanceTimersByTime(ROUND_1_PLAYER_TURN_START_MS));
    clickSequence(sequenceIds);

    expect(document.body.textContent).toContain("ROUND 1 CLEAR!");
    expect(document.querySelector(".memory-game__transition-view--clear")).not.toBeNull();
    expect(document.querySelector(".memory-game__feedback")).toBeNull();
    expect(Array.from(document.querySelectorAll(".stat")).find((stat) => stat.querySelector(".l")?.textContent === "Round")?.querySelector(".v")?.textContent).toContain("1");

    act(() => vi.advanceTimersByTime(MEMORY_TIMING.ROUND_CLEAR_DURATION_MS - 1));
    expect(document.body.textContent).toContain("ROUND 1 CLEAR!");
    expect(document.body.textContent).not.toContain("— 2 ROUND —");
    expect(Array.from(document.querySelectorAll(".stat")).find((stat) => stat.querySelector(".l")?.textContent === "Round")?.querySelector(".v")?.textContent).toContain("1");

    view.unmount();
  });

  it("begins the next round's countdown only after the clear phase finishes, never overlapping it", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const view = renderGame();
    act(() => findButton("게임 시작").click());
    const sequenceIds = getSequenceIds();

    act(() => vi.advanceTimersByTime(ROUND_1_PLAYER_TURN_START_MS));
    clickSequence(sequenceIds);
    expect(document.body.textContent).toContain("ROUND 1 CLEAR!");

    act(() => vi.advanceTimersByTime(MEMORY_TIMING.ROUND_CLEAR_DURATION_MS));
    expect(document.body.textContent).toContain("— 2 ROUND —");
    expect(document.querySelector(".memory-game__transition-view--clear")).toBeNull();

    view.unmount();
  });

  it("keeps the current round when exit is cancelled and clears timers before confirmed navigation", () => {
    const view = renderGame();
    act(() => findButton("게임 시작").click());
    act(() => findButton("일시정지").click());
    expect(document.body.textContent).toContain("일시정지");
    expect(document.querySelector('.memory-sequence[data-count="3"]')).not.toBeNull();

    act(() => findButton("게임 나가기").click());
    expect(document.body.textContent).toContain("현재 라운드 진행은 저장되지 않아요.");
    act(() => findButton("계속하기").click());
    expect(document.body.textContent).toContain("일시정지");
    expect(document.querySelector('.memory-sequence[data-count="3"]')).not.toBeNull();

    act(() => findButton("게임 나가기").click());
    act(() => Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "게임 나가기").click());
    expect(document.body.textContent).toContain("Home route");
    act(() => vi.runOnlyPendingTimers());
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
  });

  it("restarting from a paused countdown clears the pending timer and a stale timer cannot advance the restarted game", () => {
    const view = renderGame();
    act(() => findButton("게임 시작").click());
    expect(document.body.textContent).toContain("ROUND —");

    act(() => findButton("일시정지").click());
    act(() => findButton("처음부터 다시 시작").click());
    expect(document.body.textContent).toContain("게임 시작");

    // The countdown timer that was pending before the restart must not fire
    // and silently advance the restarted (idle) game.
    act(() => vi.advanceTimersByTime(COUNTDOWN_TOTAL_MS + ROUND_1_PREVIEW_MS + ROUND_1_SELECTION_MS));
    expect(document.body.textContent).toContain("게임 시작");
    expect(document.body.textContent).not.toContain("ROUND —");
    expect(vi.getTimerCount()).toBe(0);

    view.unmount();
  });

  it("clears all pending timers on unmount, so a stale round-clear timer cannot fire afterwards", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const view = renderGame();
    act(() => findButton("게임 시작").click());
    const sequenceIds = getSequenceIds();

    act(() => vi.advanceTimersByTime(ROUND_1_PLAYER_TURN_START_MS));
    clickSequence(sequenceIds);
    expect(document.body.textContent).toContain("ROUND 1 CLEAR!");

    view.unmount();
    act(() => vi.advanceTimersByTime(0));
    expect(vi.getTimerCount()).toBe(0);

    // Advancing further after unmount must not throw or resurrect state.
    expect(() => act(() => vi.advanceTimersByTime(MEMORY_TIMING.ROUND_CLEAR_DURATION_MS * 2))).not.toThrow();
  });

  it("offers retry, reset, and exit after failure while preserving the best record", () => {
    window.localStorage.setItem("eunContents.memoryOrderGame.bestRound", "7");
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const view = renderGame();
    act(() => findButton("게임 시작").click());
    const firstSequence = getSequenceIds();

    act(() => vi.advanceTimersByTime(ROUND_1_PLAYER_TURN_START_MS + ROUND_1_SELECTION_MS + 300));

    expect(document.body.textContent).toContain("한 번 더 도전해요");
    expect(findButton("남은 목숨으로 재도전")).toBeDefined();
    expect(findButton("처음부터 다시 시작")).toBeDefined();
    expect(findButton("게임 나가기")).toBeDefined();

    randomSpy.mockReturnValue(0.99);
    act(() => findButton("남은 목숨으로 재도전").click());
    const retrySequence = getSequenceIds();
    expect(retrySequence).not.toEqual(firstSequence);
    expect(window.localStorage.getItem("eunContents.memoryOrderGame.bestRound")).toBe("7");

    act(() => vi.advanceTimersByTime(ROUND_1_PLAYER_TURN_START_MS + ROUND_1_SELECTION_MS + 300));
    expect(document.body.textContent).toContain("GAME OVER");
    view.unmount();
  });
});
