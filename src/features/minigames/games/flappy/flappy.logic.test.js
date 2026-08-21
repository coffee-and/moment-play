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
import {
  advanceFlappySimulation,
  createFlappySimulation,
  replayFlappySimulation,
} from "./flappySimulation.js";

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
    const state = createInitialFlappyState(12_345);
    const replayed = createInitialFlappyState(12_345);
    expect(state.pipes).toHaveLength(2);
    expect(state.pipes[1].x - state.pipes[0].x).toBe(FLAPPY_CONFIG.pipeSpacing);
    expect(state).toEqual(replayed);
    expect(state.pipes.every((pipe) => pipe.gapY >= 31 && pipe.gapY <= 69)).toBe(true);
  });

  it("applies lift and gravity without mutating the previous state", () => {
    const state = createInitialFlappyState(12_345);
    const flapped = flapFlappyState(state);
    const result = advanceFlappyState(flapped, 0.1);
    expect(flapped).not.toBe(state);
    expect(result.state.birdY).toBeLessThan(state.birdY);
    expect(result.state.pipes[0].x).toBeLessThan(state.pipes[0].x);
  });

  it("scores a gate once after the bird passes it", () => {
    const state = createInitialFlappyState(12_345);
    state.pipes = [{ id: 0, x: FLAPPY_CONFIG.birdX - FLAPPY_CONFIG.pipeWidth + 0.1, gapY: 50, passed: false }];
    const first = advanceFlappyState(state, 0.01);
    const second = advanceFlappyState(first.state, 0.01);
    expect(first.scored).toBe(1);
    expect(first.state.gatesPassed).toBe(1);
    expect(first.state.score).toBe(10);
    expect(second.scored).toBe(0);
  });

  it("increases gate awards by combo and caps them at 30 points", () => {
    let state = createInitialFlappyState(12_345);
    const scores = [];
    for (let index = 0; index < 4; index += 1) {
      state = {
        ...state,
        birdY: 50,
        velocity: 0,
        pipes: [{ id: index, x: FLAPPY_CONFIG.birdX - FLAPPY_CONFIG.pipeWidth + 0.1, gapY: 50, passed: false }],
      };
      const result = advanceFlappyState(state, 0.01);
      scores.push(result.scoreGain);
      state = result.state;
    }
    expect(scores).toEqual([10, 20, 30, 30]);
    expect(state.maxCombo).toBe(4);
  });

  it("requires 25 clean gates for a shield and resets charge on collision", () => {
    let initial = createInitialFlappyState(12_345);
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
      }, 0.01).state;
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
    const initial = { ...createInitialFlappyState(12_345), gatesPassed: 19 };
    const shieldRecovery = recoverFlappyState({ ...initial, shieldGauge: 100, shieldReady: true });
    const lifeRecovery = recoverFlappyState(initial);
    expect(shieldRecovery.state.gatesPassed).toBe(19);
    expect(lifeRecovery.state.gatesPassed).toBe(19);
  });

  it("uses the final life before ending the flight", () => {
    const initial = createInitialFlappyState(12_345);
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

  it("replays the same seed and flap ticks into the same final state", () => {
    const proof = {
      flapTicks: [5, 17, 29, 41, 53, 65],
      maxTicks: 100,
      mode: "course",
      seed: 928_311,
    };

    expect(replayFlappySimulation(proof)).toEqual(replayFlappySimulation(proof));
  });

  it("matches incremental fixed-tick play with proof replay", () => {
    const flapTicks = [4, 16, 28, 40];
    let simulation = createFlappySimulation({ mode: "course", seed: 77_331 });
    while (simulation.tick < 60 && simulation.status === "flying") {
      simulation = advanceFlappySimulation(simulation, {
        flap: flapTicks.includes(simulation.tick),
      }).simulation;
    }

    expect(replayFlappySimulation({
      flapTicks,
      maxTicks: 60,
      mode: "course",
      seed: 77_331,
    })).toEqual(simulation);
  });

  it("rejects unordered, duplicate, or out-of-range replay input", () => {
    expect(() => replayFlappySimulation({
      flapTicks: [3, 3],
      maxTicks: 10,
      mode: "course",
      seed: 1,
    })).toThrow("비행 입력 기록이 올바르지 않습니다.");
    expect(() => replayFlappySimulation({
      flapTicks: [10],
      maxTicks: 10,
      mode: "course",
      seed: 1,
    })).toThrow("비행 입력 기록이 올바르지 않습니다.");
  });

  it("rejects a replay duration that continues after the flight has ended", () => {
    expect(() => replayFlappySimulation({
      flapTicks: [],
      maxTicks: 1_000,
      mode: "course",
      seed: 1,
    })).toThrow("비행 종료 이후의 입력 기록은 재생할 수 없습니다.");
  });

  it("detects world bounds and closed parts of a gate", () => {
    const safe = createInitialFlappyState(12_345);
    expect(hasFlappyCollision(safe)).toBe(false);

    expect(hasFlappyCollision({ ...safe, birdY: 1 })).toBe(true);
    expect(hasFlappyCollision({
      ...safe,
      birdY: 15,
      pipes: [{ id: 0, x: FLAPPY_CONFIG.birdX, gapY: 50, passed: false }],
    })).toBe(true);
  });
});
