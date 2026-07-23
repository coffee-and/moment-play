import { describe, expect, it } from "vitest";
import { createSetDeck, dealSetBoard, findSets, isSet } from "./set.logic.js";

describe("SET rules", () => {
  it("creates all 81 unique feature combinations", () => {
    const deck = createSetDeck();
    expect(deck).toHaveLength(81);
    expect(new Set(deck.map((card) => card.id)).size).toBe(81);
  });

  it("requires every feature to be all the same or all different", () => {
    const deck = createSetDeck();
    const valid = [
      deck.find((card) => card.id === "0-0-0-0"),
      deck.find((card) => card.id === "1-1-1-1"),
      deck.find((card) => card.id === "2-2-2-2"),
    ];
    const invalid = [valid[0], valid[1], deck.find((card) => card.id === "1-2-2-2")];
    expect(isSet(valid)).toBe(true);
    expect(isSet(invalid)).toBe(false);
  });

  it("always deals twelve cards containing at least one set", () => {
    const board = dealSetBoard(() => 0.42);
    expect(board).toHaveLength(12);
    expect(findSets(board).length).toBeGreaterThan(0);
  });
});
