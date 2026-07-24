import { describe, expect, it } from "vitest";
import {
  GLOW_SEQUENCE_MAX_ROUND,
  createGlowSequence,
  evaluateGlowChoice,
  getGlowGridSize,
  getGlowSequenceLength,
} from "./glowSequence.logic.js";

describe("Glow Sequence progression", () => {
  it("uses 2, 3, and 4 early repeats, then five repeats through 15 and one final 16-cell round", () => {
    expect([1, 2].map(getGlowSequenceLength)).toEqual([3, 3]);
    expect([3, 4, 5].map(getGlowSequenceLength)).toEqual([4, 4, 4]);
    expect([6, 7, 8, 9].map(getGlowSequenceLength)).toEqual([5, 5, 5, 5]);
    expect([10, 11, 12, 13, 14].map(getGlowSequenceLength)).toEqual([6, 6, 6, 6, 6]);
    expect([55, 56, 57, 58, 59].map(getGlowSequenceLength)).toEqual([15, 15, 15, 15, 15]);
    expect(getGlowSequenceLength(GLOW_SEQUENCE_MAX_ROUND)).toBe(16);
  });

  it("keeps every round on the four by four grid", () => {
    expect(getGlowGridSize(16)).toBe(4);
    expect(getGlowGridSize(25)).toBe(4);
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
