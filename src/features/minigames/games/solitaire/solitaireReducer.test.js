import { describe, expect, it } from "vitest";
import { createEmptyBoardForTest } from "./solitaire.testSupport.js";
import {
  createSolitaireState,
  SOLITAIRE_PHASE,
  solitaireReducer,
} from "./solitaireReducer.js";

function startedState() {
  const board = createEmptyBoardForTest();
  return solitaireReducer(
    createSolitaireState({ board, dealId: "deal-1", difficulty: "easy" }),
    { type: "START_GAME", board, dealId: "deal-1", difficulty: "easy" },
  );
}

describe("solitaire reducer", () => {
  it("commits board transitions atomically and restores the previous snapshot", () => {
    const state = startedState();
    const nextBoard = { ...state.board, stock: [{ id: "spades-1" }] };
    const committed = solitaireReducer(state, { type: "COMMIT_BOARD", board: nextBoard });
    const undone = solitaireReducer(committed, { type: "UNDO" });

    expect(committed).toMatchObject({ board: nextBoard, moves: 1, phase: SOLITAIRE_PHASE.PLAYING });
    expect(undone).toMatchObject({ board: state.board, moves: 0, assisted: true });
    expect(undone.history).toHaveLength(0);
  });

  it("represents a detected dead end as a game phase", () => {
    const stalled = solitaireReducer(startedState(), {
      type: "COMMIT_BOARD",
      board: createEmptyBoardForTest(),
      isStalled: true,
    });
    expect(stalled.phase).toBe(SOLITAIRE_PHASE.STALLED);
  });
});
