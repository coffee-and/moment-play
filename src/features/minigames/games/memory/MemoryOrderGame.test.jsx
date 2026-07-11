// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryOrderGame } from "./MemoryOrderGame.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function findButton(text) {
  return Array.from(document.querySelectorAll("button")).find((button) => button.textContent.includes(text));
}

function renderGame() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter initialEntries={["/minigames/memory"]}>
      <Routes>
        <Route path="/" element={<div>Home route</div>} />
        <Route path="/minigames/memory" element={<MemoryOrderGame />} />
      </Routes>
    </MemoryRouter>,
  ));
  return { host, unmount: () => act(() => root.unmount()) };
}

describe("MemoryOrderGame exit flow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
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

  it("offers retry, reset, and exit after failure while preserving the best record", () => {
    window.localStorage.setItem("eunContents.memoryOrderGame.bestRound", "7");
    let randomCalls = 0;
    vi.spyOn(Math, "random").mockImplementation(() => (randomCalls++ < 3 ? 0 : 0.99));
    const view = renderGame();
    const firstSequence = Array.from(document.querySelectorAll(".memory-sequence__item"), (item) => item.dataset.symbolId);
    act(() => findButton("게임 시작").click());
    act(() => vi.advanceTimersByTime(16000));

    expect(document.body.textContent).toContain("GAME OVER");
    expect(findButton("재도전")).toBeDefined();
    expect(findButton("처음부터 다시 시작")).toBeDefined();
    expect(findButton("게임 나가기")).toBeDefined();

    act(() => findButton("재도전").click());
    const retrySequence = Array.from(document.querySelectorAll(".memory-sequence__item"), (item) => item.dataset.symbolId);
    expect(retrySequence).not.toEqual(firstSequence);
    expect(document.body.textContent).toContain("Best7R");
    view.unmount();
  });
});
