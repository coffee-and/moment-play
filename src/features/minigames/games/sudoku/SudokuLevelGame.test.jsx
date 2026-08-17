// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { solveSudoku } from "./sudoku.logic.js";
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
    STARTING: "starting",
    UNAUTHENTICATED: "unauthenticated",
  },
  useGameResultSubmission: () => ({
    errorMessage: "",
    isStarting: false,
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

async function startEasyGame() {
  const startButton = document.querySelector('[aria-label="초급 난이도 시작"]');
  await act(async () => startButton.click());
}

function solveDefaultPuzzle(view) {
  const solution = solveSudoku(DEFAULT_SUDOKU_PUZZLE.puzzle);
  DEFAULT_SUDOKU_PUZZLE.puzzle.forEach((value, index) => {
    if (value !== 0) return;
    const cell = view.host.querySelector(`[aria-rowindex="${Math.floor(index / 9) + 1}"][aria-colindex="${index % 9 + 1}"]`);
    const number = solution[index];
    act(() => cell.click());
    act(() => view.host.querySelector(`[aria-label="${number} 입력"]`).click());
  });
}

beforeEach(() => {
  startAttempt.mockReset();
  startAttempt.mockResolvedValue({
    attemptId: "22222222-2222-4222-8222-222222222222",
    proofVersion: 2,
    puzzleId: DEFAULT_SUDOKU_PUZZLE.id,
    puzzle: DEFAULT_SUDOKU_PUZZLE.puzzle,
    ranked: true,
  });
  submitResult.mockClear();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
});

describe("Sudoku hint ranking policy", () => {
  it("submits an unassisted completed puzzle to the ranking", async () => {
    const view = renderGame();
    await startEasyGame();
    solveDefaultPuzzle(view);

    expect(submitResult).toHaveBeenCalledTimes(1);
    expect(submitResult).toHaveBeenCalledWith(expect.objectContaining({
      proof: expect.objectContaining({
        puzzleId: DEFAULT_SUDOKU_PUZZLE.id,
        events: expect.any(Array),
      }),
    }));
    expect(submitResult.mock.calls[0][0].proof).not.toHaveProperty("board");
    expect([...document.body.querySelectorAll("button")]
      .find((button) => button.textContent === "다음판!")).toBeDefined();
    expect(document.body.textContent).toContain("잘했어요");
    view.unmount();
  });

  it("keeps a hinted completion local and does not submit it to the ranking", async () => {
    const view = renderGame();
    await startEasyGame();
    act(() => [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "힌트 보기").click());
    act(() => [...view.host.querySelectorAll("button")]
      .find((button) => button.textContent === "힌트 사용하기").click());
    solveDefaultPuzzle(view);

    expect(submitResult).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("힌트 사용 · 연습 기록 · 랭킹 미제출");
    expect(document.body.textContent).toContain("잘했어요");
    view.unmount();
  });
});
