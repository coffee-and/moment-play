import { describe, expect, it } from "vitest";
import {
  GLOW_SEQUENCE_MAX_ROUND,
  createGlowSequence,
  evaluateGlowChoice,
  getGlowGridSize,
  getGlowSequenceLength,
} from "./glowSequence.logic.js";

describe("Glow Sequence progression", () => {
  it("uses the agreed early rounds and three rounds per length from 8 to 24", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(getGlowSequenceLength)).toEqual([3, 3, 4, 4, 5, 5, 6, 7]);
    expect([9, 10, 11].map(getGlowSequenceLength)).toEqual([8, 8, 8]);
    expect([12, 13, 14].map(getGlowSequenceLength)).toEqual([9, 9, 9]);
    expect([57, 58, 59].map(getGlowSequenceLength)).toEqual([24, 24, 24]);
    expect(getGlowSequenceLength(GLOW_SEQUENCE_MAX_ROUND)).toBe(25);
  });

  it("changes to a 5 by 5 grid only after 16 cells", () => {
    expect(getGlowGridSize(16)).toBe(4);
    expect(getGlowGridSize(17)).toBe(5);
  });

  it("creates a unique sequence and evaluates player choices", () => {
    let next = 0;
    const random = () => {
      next = (next + 0.173) % 1;
      return next;
    };
    const sequence = createGlowSequence(4, 8, random);
    expect(sequence).toHaveLength(8);
    expect(new Set(sequence)).toHaveLength(8);
    expect(sequence.every((cell) => cell >= 0 && cell < 16)).toBe(true);
    expect(evaluateGlowChoice(sequence, 0, sequence[0])).toMatchObject({ correct: true, nextStep: 1 });
    expect(evaluateGlowChoice(sequence, 0, 99)).toEqual({ correct: false, nextStep: 0, complete: false });
  });
});
