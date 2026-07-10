// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OMOK_COMPUTER_MOVE_DELAY_MS, OMOK_MODE, PLAYER_STONE_CHOICE, STONE } from "./omok.constants.js";
import { resolvePlayerStone } from "./omok.utils.js";
import { useOmokGame } from "./useOmokGame.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderUseOmokGame(options = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const renders = [];
  let current;

  function Harness({ hookOptions }) {
    current = useOmokGame(hookOptions);
    renders.push(current);
    return null;
  }

  act(() => {
    root.render(<Harness hookOptions={options} />);
  });

  return {
    get current() {
      return current;
    },
    get renderCount() {
      return renders.length;
    },
    rerender(nextOptions) {
      act(() => {
        root.render(<Harness hookOptions={nextOptions} />);
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("useOmokGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("starts with black and alternates turns after a move", () => {
    const hook = renderUseOmokGame({ gameMode: OMOK_MODE.STANDARD });

    expect(hook.current.turn).toBe(STONE.BLACK);
    act(() => {
      expect(hook.current.playUserMove({ row: 7, col: 7 })).toBe(true);
    });

    expect(hook.current.turn).toBe(STONE.WHITE);
    expect(hook.current.moveCount).toBe(1);
    hook.unmount();
  });

  it("rejects occupied intersections without changing move count", () => {
    const hook = renderUseOmokGame({ gameMode: OMOK_MODE.STANDARD });

    act(() => {
      hook.current.playUserMove({ row: 7, col: 7 });
    });
    act(() => {
      expect(hook.current.playUserMove({ row: 7, col: 7 })).toBe(false);
    });

    expect(hook.current.moveCount).toBe(1);
    hook.unmount();
  });

  it("blocks additional moves after the game ends", () => {
    const hook = renderUseOmokGame({ gameMode: OMOK_MODE.STANDARD });
    const moves = [
      { row: 7, col: 3 },
      { row: 0, col: 0 },
      { row: 7, col: 4 },
      { row: 0, col: 1 },
      { row: 7, col: 5 },
      { row: 0, col: 2 },
      { row: 7, col: 6 },
      { row: 0, col: 3 },
      { row: 7, col: 7 },
    ];

    for (const move of moves) {
      act(() => {
        hook.current.playUserMove(move);
      });
    }

    expect(hook.current.winner).toBe(STONE.BLACK);
    const moveCount = hook.current.moveCount;
    act(() => {
      expect(hook.current.playUserMove({ row: 14, col: 14 })).toBe(false);
    });
    expect(hook.current.moveCount).toBe(moveCount);
    hook.unmount();
  });

  it("restart resets all game state", () => {
    const hook = renderUseOmokGame({ gameMode: OMOK_MODE.STANDARD });

    act(() => {
      hook.current.playUserMove({ row: 7, col: 7 });
      hook.current.restartGame();
    });

    expect(hook.current.turn).toBe(STONE.BLACK);
    expect(hook.current.moveCount).toBe(0);
    expect(hook.current.lastMove).toBeNull();
    expect(hook.current.winner).toBeNull();
    expect(hook.current.board.flat().every((cell) => cell === null)).toBe(true);
    hook.unmount();
  });

  it("blocks user input during the computer turn", () => {
    const hook = renderUseOmokGame({
      computerStone: STONE.WHITE,
      gameMode: OMOK_MODE.STANDARD,
    });

    act(() => {
      hook.current.playUserMove({ row: 7, col: 7 });
    });

    expect(hook.current.isComputerThinking).toBe(true);
    act(() => {
      expect(hook.current.playUserMove({ row: 7, col: 8 })).toBe(false);
    });
    expect(hook.current.moveCount).toBe(1);
    hook.unmount();
  });

  it("automatically makes the first computer move when the computer is black", () => {
    const hook = renderUseOmokGame({
      computerStone: STONE.BLACK,
      gameMode: OMOK_MODE.STANDARD,
    });

    expect(hook.current.isComputerThinking).toBe(true);
    act(() => {
      vi.advanceTimersByTime(OMOK_COMPUTER_MOVE_DELAY_MS);
    });

    expect(hook.current.moveCount).toBe(1);
    expect(hook.current.board[7][7]).toBe(STONE.BLACK);
    hook.unmount();
  });

  it("cleans up a scheduled computer move on unmount", () => {
    const hook = renderUseOmokGame({
      computerStone: STONE.WHITE,
      gameMode: OMOK_MODE.STANDARD,
    });

    act(() => {
      hook.current.playUserMove({ row: 7, col: 7 });
    });
    const renderCount = hook.renderCount;
    hook.unmount();
    act(() => {
      vi.advanceTimersByTime(OMOK_COMPUTER_MOVE_DELAY_MS);
    });

    expect(hook.renderCount).toBe(renderCount);
  });

  it("resolves a random player stone each time it is requested", () => {
    expect(resolvePlayerStone(PLAYER_STONE_CHOICE.RANDOM, () => 0.2)).toBe(STONE.BLACK);
    expect(resolvePlayerStone(PLAYER_STONE_CHOICE.RANDOM, () => 0.8)).toBe(STONE.WHITE);
  });
});
