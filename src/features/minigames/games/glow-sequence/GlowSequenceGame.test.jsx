// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GlowSequenceGame } from "./GlowSequenceGame.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const playSound = vi.hoisted(() => vi.fn());

vi.mock("../../../../shared/audio/GameAudioContext.jsx", () => ({
  useGameAudio: () => ({
    enabled: false,
    isAudible: false,
    playSound,
    popDucking: vi.fn(),
    pushDucking: vi.fn(),
    toggleAudio: vi.fn(),
  }),
}));

const game = {
  title: "Glow Sequence",
  description: "빛나는 칸의 순서를 기억해요.",
};

function renderGame() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter initialEntries={["/minigames/glow-sequence"]}>
      <Routes>
        <Route path="/minigames/glow-sequence" element={<GlowSequenceGame game={game} />} />
        <Route path="/" element={<div>Home route</div>} />
      </Routes>
    </MemoryRouter>,
  ));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
  playSound.mockClear();
  vi.useRealTimers();
});

describe("GlowSequenceGame", () => {
  it("leaves immediately before a run starts", () => {
    const view = renderGame();
    const exit = [...view.host.querySelectorAll("button")].find((button) => button.textContent === "게임 나가기");
    act(() => exit.click());
    expect(view.host.textContent).toContain("Home route");
    view.unmount();
  });

  it("plays sequence cues without showing NICE during playback", () => {
    vi.useFakeTimers();
    const view = renderGame();
    const start = [...document.querySelectorAll("button")].find((button) => button.textContent === "게임 시작");
    act(() => start.click());
    act(() => vi.advanceTimersByTime(1000));
    expect(playSound).toHaveBeenCalledWith("correct", { feedback: false });
    expect(playSound).not.toHaveBeenCalledWith("correct");
    view.unmount();
  });
});
