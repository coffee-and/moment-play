import { describe, expect, it } from "vitest";
import {
  FLAPPY_CONFIG,
  advanceFlappyState,
  createInitialFlappyState,
  flapFlappyState,
  getFlappyPipeSpeed,
  hasFlappyCollision,
  recoverFlappyState,
} from "./flappy.logic.js";

describe("flappy game logic", () => {
  it("keeps the established collision and gate dimensions unchanged", () => {
    expect(FLAPPY_CONFIG.birdX).toBe(22);
    expect(FLAPPY_CONFIG.birdRadius).toBe(2.7);
    expect(FLAPPY_CONFIG.gravity).toBe(48);
    expect(FLAPPY_CONFIG.flapVelocity).toBe(-18);
    expect(FLAPPY_CONFIG.pipeWidth).toBe(10);
    expect(FLAPPY_CONFIG.gapHeight).toBe(29);
    expect(FLAPPY_CONFIG.pipeSpacing).toBe(48);
    expect(FLAPPY_CONFIG.initialLives).toBe(3);
  });

  it("raises speed only after every eight gates and keeps a modest maximum", () => {
    expect(getFlappyPipeSpeed(0)).toBe(20);
    expect(getFlappyPipeSpeed(7)).toBe(20);
    expect(getFlappyPipeSpeed(8)).toBeCloseTo(20.4);
    expect(getFlappyPipeSpeed(15)).toBeCloseTo(20.4);
    expect(getFlappyPipeSpeed(16)).toBeCloseTo(20.8);
    expect(getFlappyPipeSpeed(80)).toBe(FLAPPY_CONFIG.maxPipeSpeed);
    expect(FLAPPY_CONFIG.maxPipeSpeed).toBe(23.2);
  });

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
    expect(first.state.gatesPassed).toBe(1);
    expect(first.state.score).toBe(10);
    expect(second.scored).toBe(0);
  });

  it("increases gate awards by combo and caps them at 30 points", () => {
    let state = createInitialFlappyState(() => 0.5);
    const scores = [];
    for (let index = 0; index < 4; index += 1) {
      state = {
        ...state,
        birdY: 50,
        velocity: 0,
        pipes: [{ id: index, x: FLAPPY_CONFIG.birdX - FLAPPY_CONFIG.pipeWidth + 0.1, gapY: 50, passed: false }],
      };
      const result = advanceFlappyState(state, 0.01, () => 0.5);
      scores.push(result.scoreGain);
      state = result.state;
    }
    expect(scores).toEqual([10, 20, 30, 30]);
    expect(state.maxCombo).toBe(4);
  });

  it("starts with three lives and charges an automatic shield", () => {
    const initial = createInitialFlappyState(() => 0.5);
    expect(initial.lives).toBe(3);

    const ready = { ...initial, combo: 7, shieldGauge: 100, shieldReady: true };
    const recovered = recoverFlappyState(ready);
    expect(recovered.status).toBe("shield");
    expect(recovered.state.lives).toBe(3);
    expect(recovered.state.shieldReady).toBe(false);
    expect(recovered.state.combo).toBe(0);
    expect(recovered.state.recoverySeconds).toBe(FLAPPY_CONFIG.recoverySeconds);
  });

  it("keeps accumulated speed progress after a shield or life recovery", () => {
    const initial = { ...createInitialFlappyState(() => 0.5), gatesPassed: 19 };
    const shieldRecovery = recoverFlappyState({ ...initial, shieldGauge: 100, shieldReady: true });
    const lifeRecovery = recoverFlappyState(initial);
    expect(shieldRecovery.state.gatesPassed).toBe(19);
    expect(lifeRecovery.state.gatesPassed).toBe(19);
  });

  it("loses lives before ending the flight", () => {
    const initial = createInitialFlappyState(() => 0.5);
    const first = recoverFlappyState(initial);
    const second = recoverFlappyState({ ...first.state, recoverySeconds: 0 });
    const third = recoverFlappyState({ ...second.state, recoverySeconds: 0 });
    expect(first.status).toBe("life");
    expect(first.state.lives).toBe(2);
    expect(second.state.lives).toBe(1);
    expect(third.status).toBe("over");
    expect(third.state.lives).toBe(0);
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
