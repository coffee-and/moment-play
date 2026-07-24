// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SUDOKU_PUZZLE } from "./sudoku.puzzles.js";
import { SudokuLevelGame } from "./SudokuLevelGame.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { startAttempt, submitResult } = vi.hoisted(() => ({
  startAttempt: vi.fn(),
  submitResult: vi.fn(),
}));

vi.mock("../../../../shared/audio/GameAudioContext.jsx", () => ({
  useGameAudio: () => ({
    playSound: vi.fn(),
    popDucking: vi.fn(),
    pushDucking: vi.fn(),
  }),
}));

vi.mock("../../../ranking/useGameResultSubmission.js", () => ({
  RESULT_SUBMISSION_STATUS: {
    ERROR: "error",
    IDLE: "idle",
    SAVED: "saved",
    SAVING: "saving",
    UNAUTHENTICATED: "unauthenticated",
  },
  useGameResultSubmission: () => ({
    errorMessage: "",
    retry: vi.fn(),
    startAttempt,
    status: "idle",
    submitResult,
  }),
}));

function renderGame() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter>
      <SudokuLevelGame />
    </MemoryRouter>,
  ));
  return { host, unmount: () => act(() => root.unmount()) };
}

function startEasyGame(view) {
  const startButton = document.querySelector('[aria-label="초급 난이도 시작"]');
  act(() => startButton.click());
}

function solveDefaultPuzzle(view) {
  DEFAULT_SUDOKU_PUZZLE.puzzle.forEach((value, index) => {
    if (value !== 0) return;
    const cell = view.host.querySelector(`[aria-rowindex="${Math.floor(index / 9) + 1}"][aria-colindex="${index % 9 + 1}"]`);
    const number = DEFAULT_SUDOKU_PUZZLE.solution[index];
    act(() => cell.click());
    act(() => view.host.querySelector(`[aria-label="${number} 입력"]`).click());
  });
}

beforeEach(() => {
  startAttempt.mockClear();
  submitResult.mockClear();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
});

describe("Sudoku hint ranking policy", () => {
  it("submits an unassisted completed puzzle to the ranking", () => {
    const view = renderGame();
    startEasyGame(view);
    solveDefaultPuzzle(view);

    expect(submitResult).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("keeps a hinted completion local and does not submit it to the ranking", () => {
    const view = renderGame();
    startEasyGame(view);
    act(() => [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "힌트 보기").click());
    act(() => [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "힌트 사용하기").click());
    solveDefaultPuzzle(view);

    expect(submitResult).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("힌트 사용 · 연습 기록 · 랭킹 미제출");
    view.unmount();
  });
});
