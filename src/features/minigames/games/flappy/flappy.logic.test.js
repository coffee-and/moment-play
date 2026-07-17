import { describe, expect, it } from "vitest";
import {
  FLAPPY_CONFIG,
  advanceFlappyState,
  createInitialFlappyState,
  flapFlappyState,
  hasFlappyCollision,
} from "./flappy.logic.js";

describe("flappy game logic", () => {
  it("creates deterministic, safely spaced opening gates", () => {
    const state = createInitialFlappyState(() => 0.5);
    expect(state.pipes).toHaveLength(2);
    expect(state.pipes[1].x - state.pipes[0].x).toBe(FLAPPY_CONFIG.pipeSpacing);
    expect(state.pipes.every((pipe) => pipe.gapY === 50)).toBe(true);
  });

  it("applies lift and gravity without mutating the previous state", () => {
    const state = createInitialFlappyState(() => 0.5);
    const flapped = flapFlappyState(state);
    const result = advanceFlappyState(flapped, 0.1, () => 0.5);
    expect(flapped).not.toBe(state);
    expect(result.state.birdY).toBeLessThan(state.birdY);
    expect(result.state.pipes[0].x).toBeLessThan(state.pipes[0].x);
  });

  it("scores a gate once after the bird passes it", () => {
    const state = createInitialFlappyState(() => 0.5);
    state.pipes = [{ id: 0, x: FLAPPY_CONFIG.birdX - FLAPPY_CONFIG.pipeWidth + 0.1, gapY: 50, passed: false }];
    const first = advanceFlappyState(state, 0.01, () => 0.5);
    const second = advanceFlappyState(first.state, 0.01, () => 0.5);
    expect(first.scored).toBe(1);
    expect(first.state.score).toBe(1);
    expect(second.scored).toBe(0);
  });

  it("detects world bounds and closed parts of a gate", () => {
    const safe = createInitialFlappyState(() => 0.5);
    expect(hasFlappyCollision(safe)).toBe(false);

    expect(hasFlappyCollision({ ...safe, birdY: 1 })).toBe(true);
    expect(hasFlappyCollision({
      ...safe,
      birdY: 15,
      pipes: [{ id: 0, x: FLAPPY_CONFIG.birdX, gapY: 50, passed: false }],
    })).toBe(true);
  });
});
