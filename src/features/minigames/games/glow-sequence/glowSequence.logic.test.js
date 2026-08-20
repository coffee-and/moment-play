import { describe, expect, it } from "vitest";
import {
  createGlowSequence,
  evaluateGlowChoice,
  getGlowGridSize,
  getGlowRoundLimit,
  getGlowRoundOutcome,
  getGlowSequenceLength,
} from "./glowSequence.logic.js";
import {
  GLOW_SEQUENCE_MASTER_END_ROUND,
  GLOW_SEQUENCE_MASTER_LENGTH,
  GLOW_SEQUENCE_ROUND_OUTCOME,
  GLOW_SEQUENCE_STANDARD_END_ROUND,
} from "./glowSequence.config.js";

describe("Glow Sequence progression", () => {
  it("grows the sequence gradually across the standard and master courses", () => {
    expect([1, 2].map(getGlowSequenceLength)).toEqual([3, 3]);
    expect([3, 4, 5].map(getGlowSequenceLength)).toEqual([4, 4, 4]);
    expect([6, 7, 8, 9].map(getGlowSequenceLength)).toEqual([5, 5, 5, 5]);
    expect([10, 11, 12, 13, 14].map(getGlowSequenceLength)).toEqual([6, 6, 6, 6, 6]);
    expect(getGlowSequenceLength(GLOW_SEQUENCE_STANDARD_END_ROUND)).toBe(8);
    expect([55, 56, 57, 58, 59].map(getGlowSequenceLength)).toEqual([15, 15, 15, 15, 15]);
    expect(getGlowSequenceLength(GLOW_SEQUENCE_MASTER_END_ROUND)).toBe(GLOW_SEQUENCE_MASTER_LENGTH);
  });

  it("ends the standard course before opening the optional master course", () => {
    expect(getGlowRoundLimit(GLOW_SEQUENCE_STANDARD_END_ROUND)).toBe(GLOW_SEQUENCE_STANDARD_END_ROUND);
    expect(getGlowRoundOutcome(GLOW_SEQUENCE_STANDARD_END_ROUND)).toBe(
      GLOW_SEQUENCE_ROUND_OUTCOME.STANDARD_COMPLETE,
    );
    expect(getGlowRoundLimit(GLOW_SEQUENCE_STANDARD_END_ROUND + 1)).toBe(GLOW_SEQUENCE_MASTER_END_ROUND);
    expect(getGlowRoundOutcome(GLOW_SEQUENCE_STANDARD_END_ROUND + 1)).toBe(
      GLOW_SEQUENCE_ROUND_OUTCOME.CONTINUE,
    );
    expect(getGlowRoundOutcome(GLOW_SEQUENCE_MASTER_END_ROUND)).toBe(
      GLOW_SEQUENCE_ROUND_OUTCOME.MASTER_COMPLETE,
    );
  });

  it("keeps the master sequence within the fixed four by four grid", () => {
    expect(getGlowGridSize()).toBe(4);
    expect(GLOW_SEQUENCE_MASTER_LENGTH).toBeLessThanOrEqual(getGlowGridSize() ** 2);
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
