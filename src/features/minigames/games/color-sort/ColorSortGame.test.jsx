// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ColorSortGame } from "./ColorSortGame.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../../../../shared/audio/GameAudioContext.jsx", () => ({
  useGameAudio: () => ({
    enabled: false,
    isAudible: false,
    playSound: vi.fn(),
    popDucking: vi.fn(),
    pushDucking: vi.fn(),
    toggleAudio: vi.fn(),
  }),
}));

const game = {
  title: "Color Sort",
  description: "같은 색끼리 정리해요.",
};

function renderGame() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter initialEntries={["/minigames/color-sort"]}>
      <Routes>
        <Route path="/minigames/color-sort" element={<ColorSortGame game={game} />} />
        <Route path="/" element={<div>Home route</div>} />
      </Routes>
    </MemoryRouter>,
  ));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ColorSortGame", () => {
  it("leaves immediately before a run starts", () => {
    const view = renderGame();
    const exit = [...view.host.querySelectorAll("button")].find((button) => button.textContent === "게임 나가기");
    act(() => exit.click());
    expect(view.host.textContent).toContain("Home route");
    view.unmount();
  });

  it("starts with four colors, six tubes, and moves a top group into an empty tube", () => {
    const view = renderGame();
    const start = [...view.host.querySelectorAll("button")].find((button) => button.textContent === "게임 시작");
    act(() => start.click());
    const tubes = [...view.host.querySelectorAll(".color-sort__tube")];
    expect(tubes).toHaveLength(6);
    const source = tubes.find((tube) => !tube.getAttribute("aria-label").includes("블록 0개"));
    const destination = tubes.find((tube) => tube.getAttribute("aria-label").includes("블록 0개"));
    act(() => source.click());
    act(() => destination.click());
    const movesStat = [...view.host.querySelectorAll(".stat")].find((stat) => stat.querySelector(".l")?.textContent === "Moves");
    expect(movesStat.querySelector(".v")?.textContent).toBe("1");
    view.unmount();
  });
});
