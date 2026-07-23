// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MoonMirrorGame } from "./moon-mirror/MoonMirrorGame.jsx";
import { NonogramGame } from "./nonogram/NonogramGame.jsx";
import { StarTraceGame } from "./star-trace/StarTraceGame.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../../../shared/audio/GameAudioContext.jsx", () => ({
  useGameAudio: () => ({
    enabled: false,
    isAudible: false,
    playSound: vi.fn(),
    popDucking: vi.fn(),
    pushDucking: vi.fn(),
    toggleAudio: vi.fn(),
  }),
}));

const games = [
  { id: "star-trace", title: "Star Trace", description: "별을 이어요.", Component: StarTraceGame },
  { id: "moon-mirror", title: "Moonlight Mirror", description: "대칭을 맞춰요.", Component: MoonMirrorGame },
  { id: "nonogram", title: "Nonogram", description: "그림을 찾아요.", Component: NonogramGame },
];

function renderGame({ Component, ...game }) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter initialEntries={[`/minigames/${game.id}`]}>
      <Routes>
        <Route path={`/minigames/${game.id}`} element={<Component game={game} />} />
        <Route path="/" element={<div>Home route</div>} />
      </Routes>
    </MemoryRouter>,
  ));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("endless puzzle games", () => {
  it.each(games)("starts $title on easy round one", (game) => {
    const view = renderGame(game);
    const start = [...document.querySelectorAll("button")].find((button) => button.textContent === "게임 시작");
    act(() => start.click());
    expect(view.host.textContent).toContain("EASY");
    expect(view.host.textContent).toContain("1/10");
    view.unmount();
  });

  it("uses the agreed mobile-first board sizes", () => {
    const trace = renderGame(games[0]);
    act(() => [...document.querySelectorAll("button")].find((button) => button.textContent === "게임 시작").click());
    expect(trace.host.querySelectorAll(".star-trace__star")).toHaveLength(5);
    trace.unmount();

    const mirror = renderGame(games[1]);
    act(() => [...document.querySelectorAll("button")].find((button) => button.textContent === "게임 시작").click());
    expect(mirror.host.querySelectorAll(".moon-mirror__cell")).toHaveLength(16);
    mirror.unmount();

    const nonogram = renderGame(games[2]);
    act(() => [...document.querySelectorAll("button")].find((button) => button.textContent === "게임 시작").click());
    expect(nonogram.host.querySelectorAll(".nonogram__cell")).toHaveLength(25);
    nonogram.unmount();
  });

  it("shows the shared leave confirmation after a game starts", () => {
    const view = renderGame(games[0]);
    act(() => [...document.querySelectorAll("button")].find((button) => button.textContent === "게임 시작").click());
    act(() => [...view.host.querySelectorAll("button")].find((button) => button.textContent === "게임 나가기").click());
    expect(document.body.textContent).toContain("도전을 나갈까요?");
    expect(document.querySelector(".game-stage-modal [data-doodle-variant]")).toBeNull();
    view.unmount();
  });
});
