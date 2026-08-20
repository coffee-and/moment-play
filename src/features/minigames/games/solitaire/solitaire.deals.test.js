import { describe, expect, it } from "vitest";
import { SOLITAIRE_DIFFICULTY } from "./solitaire.logic.js";
import {
  createCertifiedSolitaireDeal,
  createCertifiedSolitaireDealFixture,
  getSolitaireDealSeeds,
} from "./solitaire.deals.js";
import { verifyCertifiedSolitaireDeal } from "./solitaire.deals.verify.js";

describe("certified Solitaire deals", () => {
  it.each(Object.values(SOLITAIRE_DIFFICULTY))(
    "replays every %s deal certificate to completion",
    (difficulty) => {
      getSolitaireDealSeeds(difficulty).forEach((seed) => {
        expect(verifyCertifiedSolitaireDeal(seed, difficulty)).toBe(true);
      });
    },
  );

  it("avoids the previous deal when another certified deal is available", () => {
    const first = createCertifiedSolitaireDeal(SOLITAIRE_DIFFICULTY.EASY, () => 0);
    const next = createCertifiedSolitaireDeal(SOLITAIRE_DIFFICULTY.EASY, () => 0, first.id);
    expect(next.id).not.toBe(first.id);
  });

  it("keeps the standard tableau and stock shape", () => {
    const deal = createCertifiedSolitaireDeal(SOLITAIRE_DIFFICULTY.EASY, () => 0);
    expect(deal.board.tableau.map((column) => column.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(deal.board.stock).toHaveLength(24);
    expect(deal.board.tableau.every((column) => column.at(-1).faceUp)).toBe(true);
  });

  it("keeps draw-three fair without making every stock card available in one pass", () => {
    getSolitaireDealSeeds(SOLITAIRE_DIFFICULTY.HARD).forEach((seed) => {
      const fixture = createCertifiedSolitaireDealFixture(seed, SOLITAIRE_DIFFICULTY.HARD);
      expect(fixture.certificate.stockPlan.recycledCount).toBeGreaterThanOrEqual(1);
    });
  });
});
