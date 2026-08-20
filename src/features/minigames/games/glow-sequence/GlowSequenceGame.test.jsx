// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GlowSequenceGame } from "./GlowSequenceGame.jsx";
import {
  GLOW_SEQUENCE_MASTER_END_ROUND,
  GLOW_SEQUENCE_STANDARD_END_ROUND,
  GLOW_SEQUENCE_TIMING,
} from "./glowSequence.config.js";
import {
  createGlowSequence,
  getGlowGridSize,
  getGlowPlaybackDuration,
  getGlowSequenceLength,
} from "./glowSequence.logic.js";

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

function findButton(host, label) {
  return [...host.querySelectorAll("button")].find((button) => button.textContent === label);
}

function completeRound(host, round) {
  const length = getGlowSequenceLength(round);
  const sequence = createGlowSequence(getGlowGridSize(), length, () => 0);
  act(() => vi.advanceTimersByTime(getGlowPlaybackDuration(length)));
  sequence.forEach((cell) => {
    act(() => host.querySelector(`[aria-label="${cell + 1}번 칸"]`).click());
  });
}

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
  playSound.mockClear();
  vi.restoreAllMocks();
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

  it("plays sequence cues during playback", () => {
    vi.useFakeTimers();
    const view = renderGame();
    const start = [...document.querySelectorAll("button")].find((button) => button.textContent === "게임 시작");
    act(() => start.click());
    act(() => vi.advanceTimersByTime(1000));
    expect(playSound).toHaveBeenCalledWith("correct");
    view.unmount();
  });

  it("stops at the standard completion and enters the master course only by choice", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const view = renderGame();
    act(() => findButton(document, "게임 시작").click());

    for (let round = 1; round <= GLOW_SEQUENCE_STANDARD_END_ROUND; round += 1) {
      completeRound(view.host, round);
      if (round < GLOW_SEQUENCE_STANDARD_END_ROUND) {
        act(() => vi.advanceTimersByTime(GLOW_SEQUENCE_TIMING.ROUND_CLEAR_MS));
      }
    }

    expect(document.querySelector("#glow-standard-title")).not.toBeNull();
    expect(view.host.textContent).toContain(`${GLOW_SEQUENCE_STANDARD_END_ROUND}/${GLOW_SEQUENCE_STANDARD_END_ROUND}`);

    act(() => findButton(document, "MASTER 도전 계속").click());
    expect(view.host.textContent).toContain(
      `${GLOW_SEQUENCE_STANDARD_END_ROUND + 1}/${GLOW_SEQUENCE_MASTER_END_ROUND}`,
    );
    view.unmount();
  });
});
