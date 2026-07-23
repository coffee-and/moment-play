// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getMinigameById } from "../data/minigameCatalog.js";
import { BlockBlastGame } from "./block-blast/BlockBlastGame.jsx";
import { LitsGame } from "./lits/LitsGame.jsx";
import { MinesweeperGame } from "./minesweeper/MinesweeperGame.jsx";
import { MosaicGame } from "./mosaic/MosaicGame.jsx";
import { SetGame } from "./set/SetGame.jsx";
import { ShikakuGame } from "./shikaku/ShikakuGame.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderGame(GameComponent, gameId) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter initialEntries={[`/minigames/${gameId}`]}>
      <GameComponent game={getMinigameById(gameId)} />
    </MemoryRouter>,
  ));
  const startButton = [...document.body.querySelectorAll("button")]
    .find((button) => button.textContent === "게임 시작");
  act(() => startButton.click());
  return {
    host,
    unmount: () => act(() => root.unmount()),
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("new playable games", () => {
  it("starts LITS and accepts cell input", () => {
    const view = renderGame(LitsGame, "lits");
    const firstCell = view.host.querySelector('[aria-label^="1행 1열"]');
    act(() => firstCell.click());
    expect(firstCell.getAttribute("aria-pressed")).toBe("true");
    view.unmount();
  });

  it("starts Shikaku and claims a valid rectangle", () => {
    const view = renderGame(ShikakuGame, "shikaku");
    const firstCorner = view.host.querySelector('[aria-label^="1행 1열"]');
    const secondCorner = view.host.querySelector('[aria-label^="2행 2열"]');
    act(() => firstCorner.click());
    act(() => secondCorner.click());
    expect(firstCorner.getAttribute("aria-pressed")).toBe("true");
    expect(secondCorner.getAttribute("aria-pressed")).toBe("true");
    view.unmount();
  });

  it("starts Minesweeper with a safe first reveal", () => {
    const view = renderGame(MinesweeperGame, "minesweeper");
    const firstCell = view.host.querySelector('[data-index="0"]');
    act(() => firstCell.click());
    expect(firstCell.getAttribute("aria-label")).not.toContain("닫힘");
    expect(firstCell.getAttribute("aria-label")).not.toContain("지뢰");
    view.unmount();
  });

  it("starts SET and selects a card", () => {
    const view = renderGame(SetGame, "set");
    const firstCard = view.host.querySelector(".set-card");
    act(() => firstCard.click());
    expect(firstCard.getAttribute("aria-pressed")).toBe("true");
    view.unmount();
  });

  it("starts Mosaic and fills a clue cell", () => {
    const view = renderGame(MosaicGame, "mosaic");
    const firstCell = view.host.querySelector(".mosaic-cell");
    act(() => firstCell.click());
    expect(firstCell.getAttribute("aria-pressed")).toBe("true");
    view.unmount();
  });

  it("shows where a selected Block Blast piece can go and places it there", () => {
    const view = renderGame(BlockBlastGame, "block-blast");
    const firstPiece = view.host.querySelector(".block-piece:not(:disabled)");
    act(() => firstPiece.click());

    expect(view.host.querySelector('[role="status"]').textContent).toContain("점 표시가 있는 칸");
    const validCell = [...view.host.querySelectorAll(".block-blast-cell")]
      .find((cell) => cell.getAttribute("aria-label").includes("놓을 수 있음"));
    expect(validCell).toBeTruthy();

    act(() => validCell.click());
    expect(validCell.getAttribute("aria-label")).toContain("채워짐");
    view.unmount();
  });

  it("pauses a logic puzzle without advancing time or accepting board input", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const view = renderGame(LitsGame, "lits");
    const firstCell = view.host.querySelector('[aria-label^="1행 1열"]');

    act(() => vi.advanceTimersByTime(2100));
    expect(view.host.querySelector('[aria-label^="경과 시간"]').getAttribute("aria-label")).toContain("00:02");

    const pauseButton = view.host.querySelector('[aria-label="게임 일시정지"]');
    act(() => pauseButton.click());
    act(() => firstCell.click());
    act(() => vi.advanceTimersByTime(5000));

    expect(firstCell.getAttribute("aria-pressed")).toBe("false");
    expect(view.host.querySelector('[aria-label^="경과 시간"]').getAttribute("aria-label")).toContain("00:02");

    const resumeButton = [...document.body.querySelectorAll("button")]
      .find((button) => button.textContent.includes("계속하기"));
    act(() => resumeButton.click());
    act(() => vi.advanceTimersByTime(1100));
    expect(view.host.querySelector('[aria-label^="경과 시간"]').getAttribute("aria-label")).toContain("00:03");
    view.unmount();
  });

  it("enlarges a board and restores the fitted size with accessible controls", () => {
    const view = renderGame(MinesweeperGame, "minesweeper");
    const zoomValue = view.host.querySelector('[aria-label="현재 보드 크기"]');

    act(() => view.host.querySelector('[aria-label="보드 확대"]').click());
    expect(zoomValue.textContent).toBe("125%");

    act(() => view.host.querySelector('[aria-label="보드 화면에 맞추기"]').click());
    expect(zoomValue.textContent).toBe("100%");
    view.unmount();
  });
});
