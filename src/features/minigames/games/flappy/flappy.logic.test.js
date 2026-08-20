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
import {
  FLAPPY_SESSION_CONFIG,
  advanceFlappySession,
  createFlappyCourseMetrics,
  createFlappyCourseSession,
  createFlappyEndlessSession,
} from "./flappySession.js";

describe("flappy game logic", () => {
  it("derives course and endless speed from the session instead of score", () => {
    expect(getFlappyPipeSpeed({ round: 1 })).toBe(20);
    expect(getFlappyPipeSpeed({ round: 5 })).toBeCloseTo(22.4);
    expect(getFlappyPipeSpeed({
      endlessElapsedMs: FLAPPY_CONFIG.endlessSpeedIncreaseEveryMs,
      mode: "endless",
      round: 5,
    })).toBeCloseTo(22.6);
    expect(getFlappyPipeSpeed({
      endlessElapsedMs: 10 * FLAPPY_CONFIG.endlessSpeedIncreaseEveryMs,
      mode: "endless",
      round: 5,
    })).toBe(FLAPPY_CONFIG.maxPipeSpeed);
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
    const result = advanceFlappyState(flapped, 0.1, { random: () => 0.5 });
    expect(flapped).not.toBe(state);
    expect(result.state.birdY).toBeLessThan(state.birdY);
    expect(result.state.pipes[0].x).toBeLessThan(state.pipes[0].x);
  });

  it("scores a gate once after the bird passes it", () => {
    const state = createInitialFlappyState(() => 0.5);
    state.pipes = [{ id: 0, x: FLAPPY_CONFIG.birdX - FLAPPY_CONFIG.pipeWidth + 0.1, gapY: 50, passed: false }];
    const first = advanceFlappyState(state, 0.01, { random: () => 0.5 });
    const second = advanceFlappyState(first.state, 0.01, { random: () => 0.5 });
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
      const result = advanceFlappyState(state, 0.01, { random: () => 0.5 });
      scores.push(result.scoreGain);
      state = result.state;
    }
    expect(scores).toEqual([10, 20, 30, 30]);
    expect(state.maxCombo).toBe(4);
  });

  it("requires 25 clean gates for a shield and resets charge on collision", () => {
    let initial = createInitialFlappyState(() => 0.5);
    for (let gate = 1; gate <= 25; gate += 1) {
      initial = advanceFlappyState({
        ...initial,
        birdY: 50,
        pipes: [{
          id: gate,
          x: FLAPPY_CONFIG.birdX - FLAPPY_CONFIG.pipeWidth + 0.1,
          gapY: 50,
          passed: false,
        }],
        velocity: 0,
      }, 0.01, { random: () => 0.5 }).state;
      if (gate === 24) expect(initial.shieldReady).toBe(false);
    }
    expect(initial.shieldReady).toBe(true);

    const ready = { ...initial, combo: 7, shieldGauge: 100, shieldReady: true };
    const recovered = recoverFlappyState(ready);
    expect(recovered.status).toBe("shield");
    expect(recovered.state.lives).toBe(2);
    expect(recovered.state.shieldReady).toBe(false);
    expect(recovered.state.shieldGauge).toBe(0);
    expect(recovered.state.combo).toBe(0);
    expect(recovered.state.mistakes).toBe(1);
    expect(recovered.state.recoverySeconds).toBe(FLAPPY_CONFIG.recoverySeconds);
  });

  it("keeps accumulated speed progress after a shield or life recovery", () => {
    const initial = { ...createInitialFlappyState(() => 0.5), gatesPassed: 19 };
    const shieldRecovery = recoverFlappyState({ ...initial, shieldGauge: 100, shieldReady: true });
    const lifeRecovery = recoverFlappyState(initial);
    expect(shieldRecovery.state.gatesPassed).toBe(19);
    expect(lifeRecovery.state.gatesPassed).toBe(19);
  });

  it("uses the final life before ending the flight", () => {
    const initial = createInitialFlappyState(() => 0.5);
    const first = recoverFlappyState(initial);
    const second = recoverFlappyState({ ...first.state, recoverySeconds: 0 });
    expect(first.status).toBe("life");
    expect(first.state.lives).toBe(1);
    expect(first.state.shieldGauge).toBe(0);
    expect(second.status).toBe("over");
    expect(second.state.lives).toBe(0);
  });

  it("runs five 90-second rounds and then opens a separate endless session", () => {
    let session = createFlappyCourseSession();

    for (let round = 2; round <= FLAPPY_SESSION_CONFIG.courseRoundCount; round += 1) {
      const result = advanceFlappySession(session, FLAPPY_SESSION_CONFIG.roundDurationMs);
      expect(result.event).toBe("round-complete");
      expect(result.session.round).toBe(round);
      session = result.session;
    }

    const completion = advanceFlappySession(session, FLAPPY_SESSION_CONFIG.roundDurationMs);
    expect(completion.event).toBe("course-complete");
    expect(completion.session.totalElapsedMs).toBe(450_000);

    const endless = advanceFlappySession(createFlappyEndlessSession(), 12_345);
    expect(endless.event).toBeNull();
    expect(endless.session.round).toBe(5);
    expect(endless.session.totalElapsedMs).toBe(12_345);
  });

  it("creates stable course metrics for a future ranking verifier", () => {
    expect(createFlappyCourseMetrics({ score: 840, maxCombo: 16, mistakes: 2 })).toEqual({
      courseMaxCombo: 16,
      courseMistakes: 2,
      courseScore: 840,
    });
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
