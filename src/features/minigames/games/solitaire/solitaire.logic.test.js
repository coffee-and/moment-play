import { describe, expect, it } from "vitest";
import {
  canPlaceOnFoundation,
  canPlaceOnTableau,
  createSolitaireDeck,
  dealSolitaire,
  drawSolitaireStock,
  findSolitaireHint,
  isValidTableauRun,
  moveSolitaireSelection,
} from "./solitaire.logic.js";

function card({ color = "black", faceUp = true, rank, suit = "spades" }) {
  return { id: `${suit}-${rank}`, color, faceUp, rank, suit, symbol: suit === "hearts" ? "♥" : "♠" };
}

function stateWith(overrides = {}) {
  return {
    stock: [],
    waste: [],
    foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
    tableau: Array.from({ length: 7 }, () => []),
    ...overrides,
  };
}

describe("solitaire rules", () => {
  it("creates and deals a standard 52-card deck", () => {
    expect(createSolitaireDeck()).toHaveLength(52);
    const state = dealSolitaire(() => 0.5);
    expect(state.tableau.map((column) => column.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(state.stock).toHaveLength(24);
    expect(state.tableau.every((column) => column.at(-1).faceUp)).toBe(true);
  });

  it("uses descending alternating colors in tableau and ascending suits in foundations", () => {
    expect(canPlaceOnTableau(card({ color: "red", rank: 12, suit: "hearts" }), card({ rank: 13 }))).toBe(true);
    expect(canPlaceOnTableau(card({ rank: 12 }), card({ rank: 13 }))).toBe(false);
    expect(canPlaceOnTableau(card({ rank: 13 }), null)).toBe(true);
    expect(canPlaceOnFoundation(card({ color: "red", rank: 1, suit: "hearts" }), [])).toBe(true);
    expect(canPlaceOnFoundation(card({ color: "red", rank: 2, suit: "hearts" }), [card({ color: "red", rank: 1, suit: "hearts" })])).toBe(true);
  });

  it("draws one or three cards and recycles the waste", () => {
    const stock = [card({ rank: 1 }), card({ rank: 2 }), card({ rank: 3 })].map((value) => ({ ...value, faceUp: false }));
    const drawn = drawSolitaireStock(stateWith({ stock }), 3);
    expect(drawn.state.stock).toHaveLength(0);
    expect(drawn.state.waste.at(-1).rank).toBe(1);
    const recycled = drawSolitaireStock(drawn.state, 3);
    expect(recycled.state.stock).toHaveLength(3);
    expect(recycled.state.waste).toHaveLength(0);
  });

  it("moves a valid tableau run and exposes the source top card", () => {
    const hidden = card({ faceUp: false, rank: 9 });
    const redEight = card({ color: "red", rank: 8, suit: "hearts" });
    const blackSeven = card({ rank: 7 });
    const blackNine = card({ rank: 9 });
    const state = stateWith({
      tableau: [[hidden, redEight, blackSeven], [blackNine], [], [], [], [], []],
    });
    expect(isValidTableauRun(state.tableau[0], 1)).toBe(true);
    const result = moveSolitaireSelection(
      state,
      { type: "tableau", column: 0, index: 1 },
      { type: "tableau", column: 1 },
    );
    expect(result.moved).toBe(true);
    expect(result.state.tableau[0][0].faceUp).toBe(true);
    expect(result.state.tableau[1].map((value) => value.rank)).toEqual([9, 8, 7]);
  });

  it("recommends a concrete legal move before asking the player to draw", () => {
    const redAce = card({ color: "red", rank: 1, suit: "hearts" });
    const state = stateWith({ tableau: [[redAce], [], [], [], [], [], []] });
    const hint = findSolitaireHint(state);
    const result = moveSolitaireSelection(state, hint.source, hint.destination);

    expect(hint).toMatchObject({
      type: "move",
      source: { type: "tableau", column: 0 },
      destination: { type: "foundation", suit: "hearts" },
    });
    expect(result.moved).toBe(true);
  });
});
