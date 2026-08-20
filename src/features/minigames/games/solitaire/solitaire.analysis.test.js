import { describe, expect, it } from "vitest";
import {
  analyzeSolitaireProgress,
  findSolitaireHint,
  SOLITAIRE_PROGRESS_STATUS,
} from "./solitaire.analysis.js";
import { createEmptyBoardForTest } from "./solitaire.testSupport.js";

function card({ color = "black", faceUp = true, rank, suit = "spades" }) {
  return {
    id: `${suit}-${rank}`,
    color,
    faceUp,
    rank,
    suit,
    symbol: suit === "hearts" ? "♥" : "♠",
  };
}

describe("Solitaire progress analysis", () => {
  it("detects a full stock cycle with no legal move as a stalemate", () => {
    const board = createEmptyBoardForTest({
      stock: [card({ faceUp: false, rank: 5 })],
    });
    expect(analyzeSolitaireProgress(board, 1)).toMatchObject({
      status: SOLITAIRE_PROGRESS_STATUS.STALEMATE,
    });
    expect(findSolitaireHint(board, 1)).toBeNull();
  });

  it("reports how many draws are needed before a useful waste card appears", () => {
    const redAce = card({ color: "red", faceUp: false, rank: 1, suit: "hearts" });
    const blocked = card({ faceUp: false, rank: 5 });
    const board = createEmptyBoardForTest({ stock: [redAce, blocked] });
    expect(analyzeSolitaireProgress(board, 1)).toMatchObject({
      status: SOLITAIRE_PROGRESS_STATUS.DRAW_REQUIRED,
      drawSteps: 2,
    });
    expect(findSolitaireHint(board, 1)).toMatchObject({ type: "draw", drawSteps: 2 });
  });
});
