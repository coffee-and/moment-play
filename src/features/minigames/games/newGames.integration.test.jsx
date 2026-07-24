// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getMinigameById } from "../data/minigameCatalog.js";
import { BlockBlastGame } from "./block-blast/BlockBlastGame.jsx";
import { LitsGame } from "./lits/LitsGame.jsx";
import { LITS_PUZZLES } from "./lits/lits.logic.js";
import { MinesweeperGame } from "./minesweeper/MinesweeperGame.jsx";
import { MosaicGame } from "./mosaic/MosaicGame.jsx";
import { SetGame } from "./set/SetGame.jsx";
import { ShikakuGame } from "./shikaku/ShikakuGame.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderGame(GameComponent, gameId, { start = true } = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter initialEntries={[`/minigames/${gameId}`]}>
      <GameComponent game={getMinigameById(gameId)} />
    </MemoryRouter>,
  ));
  if (start) {
    const startButton = [...document.body.querySelectorAll("button")]
      .find((button) => button.textContent === "게임 시작");
    act(() => startButton.click());
  }
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
  it("walks through a new game's instructions one step at a time before starting", () => {
    const view = renderGame(SetGame, "set", { start: false });

    expect(document.body.textContent).toContain("1 / 3");
    expect(document.body.textContent).toContain("각 속성이 세 장 모두 같거나");
    expect(document.body.querySelector('[role="img"]').getAttribute("aria-label")).toContain("카드별로 비교");
    const nextButton = [...document.body.querySelectorAll("button")]
      .find((button) => button.textContent === "다음");
    act(() => nextButton.click());

    expect(document.body.textContent).toContain("2 / 3");
    expect(document.body.textContent).toContain("한 속성이라도 두 장만 같고");
    expect(document.body.querySelector('[role="img"]').getAttribute("aria-label")).toContain("SET이 아닌");
    view.unmount();
  });

  it("starts LITS and accepts cell input", () => {
    const view = renderGame(LitsGame, "lits");
    const firstCell = view.host.querySelector('[aria-label^="1행 1열"]');
    act(() => firstCell.click());
    expect(firstCell.getAttribute("aria-pressed")).toBe("true");
    view.unmount();
  });

  it("marks a puzzle as a practice run only after the player accepts a hint", () => {
    const view = renderGame(LitsGame, "lits");
    const hintButton = [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "힌트 보기");

    act(() => hintButton.click());
    expect(view.host.textContent).toContain("공식 랭킹에는 제출되지 않아요");
    expect(view.host.querySelectorAll(".is-hint-target")).toHaveLength(0);

    const acceptButton = [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "힌트 사용하기");
    act(() => acceptButton.click());

    expect(view.host.textContent).toContain("힌트 1 / 3");
    expect(view.host.querySelectorAll(".is-hint-target").length).toBeGreaterThan(0);
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

  it("numbers SET hint targets, keeps selection separate, and moves focus back to the board", () => {
    const view = renderGame(SetGame, "set");
    const hintButton = [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "힌트 보기");
    act(() => hintButton.click());
    act(() => [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "힌트 사용하기").click());

    expect(view.host.textContent).toContain("강조된 두 카드와 함께 SET을 이루는 마지막 카드 한 장을 찾아보세요.");
    let targets = [...view.host.querySelectorAll(".set-card.is-set-hint-target")];
    expect(targets).toHaveLength(2);
    expect(targets.map((card) => card.dataset.hintOrder)).toEqual(["1", "2"]);
    expect(targets[0].getAttribute("aria-label")).toContain("힌트 카드 1");

    act(() => targets[0].click());
    expect(targets[0].classList.contains("is-selected")).toBe(true);
    expect(targets[0].classList.contains("is-set-hint-target")).toBe(true);

    act(() => [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "다음 힌트").click());
    expect(view.host.textContent).toContain("색·모양·개수·채움을 하나씩 비교해보세요.");
    expect(view.host.querySelectorAll(".set-card.is-set-hint-target")).toHaveLength(2);

    act(() => [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "다음 힌트").click());
    expect(view.host.textContent).toContain("각 속성은 세 카드가 모두 같거나 모두 달라야 해요.");
    targets = [...view.host.querySelectorAll(".set-card.is-set-hint-target")];
    expect(targets.map((card) => card.dataset.hintOrder)).toEqual(["1", "2", "3"]);

    const scrollIntoView = vi.fn();
    targets[0].scrollIntoView = scrollIntoView;
    const requestAnimationFrame = vi.spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback();
        return 1;
      });
    act(() => [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "보드에서 보기").click());

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center", inline: "nearest" });
    expect(document.activeElement).toBe(targets[0]);
    expect(view.host.querySelectorAll(".set-card.is-set-hint-target")).toHaveLength(3);
    requestAnimationFrame.mockRestore();
    view.unmount();
  });

  it("moves LITS to the next validated puzzle after a clear", () => {
    const view = renderGame(LitsGame, "lits");
    const firstPuzzleId = view.host.querySelector(".lits-board").dataset.puzzleId;

    LITS_PUZZLES[0].solution.forEach((index) => {
      act(() => view.host.querySelectorAll(".lits-cell")[index].click());
    });

    const nextButton = [...document.body.querySelectorAll("button")]
      .find((button) => button.textContent === "다음판!");
    expect(nextButton).toBeDefined();
    expect(document.body.textContent).toContain("잘했어요");
    act(() => nextButton.click());

    expect(view.host.querySelector(".lits-board").dataset.puzzleId).not.toBe(firstPuzzleId);
    expect(view.host.querySelector(".lits-board").dataset.puzzleId).toBe(LITS_PUZZLES[1].id);
    view.unmount();
  });

  it("reveals one valid SET after the player gives up and then deals fresh cards", () => {
    const view = renderGame(SetGame, "set");
    const revealButton = [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "포기");

    act(() => revealButton.click());
    expect(document.body.textContent).toContain("정말 포기할까요?");
    const confirmButton = [...document.body.querySelectorAll("button")]
      .find((button) => button.textContent === "정답 보기");
    act(() => confirmButton.click());

    expect(view.host.querySelector('[role="status"]').textContent).toContain("정답 세 장");
    expect(view.host.querySelectorAll('button[aria-label*="정답 카드"]')).toHaveLength(3);
    const nextButton = [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "다음 카드");
    act(() => nextButton.click());

    expect(view.host.querySelector('[role="status"]').textContent).toContain("새로운 카드");
    expect(view.host.querySelectorAll('button[aria-label*="정답 카드"]')).toHaveLength(0);
    view.unmount();
  });

  it("reveals and locks the LITS answer after surrender confirmation", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const view = renderGame(LitsGame, "lits");
    act(() => vi.advanceTimersByTime(2100));
    const surrenderButton = [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "포기");
    act(() => surrenderButton.click());
    const confirmButton = [...document.body.querySelectorAll("button")]
      .find((button) => button.textContent === "정답 보기");
    act(() => confirmButton.click());

    const cells = [...view.host.querySelectorAll(".lits-cell")];
    expect(cells.filter((cell) => cell.getAttribute("aria-pressed") === "true")).toHaveLength(24);
    expect(cells.every((cell) => cell.disabled)).toBe(true);
    expect(view.host.querySelector('[role="status"]').textContent).toContain("정답을 표시");
    act(() => vi.advanceTimersByTime(5000));
    expect(view.host.querySelector('[aria-label^="경과 시간"]').getAttribute("aria-label")).toContain("00:02");
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
