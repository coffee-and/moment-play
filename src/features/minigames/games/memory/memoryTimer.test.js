import { describe, expect, it } from "vitest";
import { isMemoryTimerUrgent, MEMORY_TIMER_PHASE } from "./MemoryOrderGame.jsx";
import {
  MEMORY_ORDER_INITIAL_LIVES,
  MEMORY_ORDER_ROUNDS,
  chargeMemoryReplayGauge,
  getMemoryRoundAward,
  getMemorySymbolCount,
  resolveMemoryFailure,
} from "./memoryOrder.logic.js";

describe("memory timer urgency", () => {
  it("is not urgent at 4 seconds or more", () => {
    expect(isMemoryTimerUrgent(MEMORY_TIMER_PHASE.PLAYING, 4000)).toBe(false);
    expect(isMemoryTimerUrgent(MEMORY_TIMER_PHASE.PREVIEW, 4001)).toBe(false);
  });

  it("is urgent at 3 seconds or less while visible", () => {
    expect(isMemoryTimerUrgent(MEMORY_TIMER_PHASE.PLAYING, 3000)).toBe(true);
    expect(isMemoryTimerUrgent(MEMORY_TIMER_PHASE.PLAYING, 2000)).toBe(true);
    expect(isMemoryTimerUrgent(MEMORY_TIMER_PHASE.PREVIEW, 1000)).toBe(true);
  });

  it("removes urgency when the timer is no longer active", () => {
    expect(isMemoryTimerUrgent(MEMORY_TIMER_PHASE.FAILED, 1000)).toBe(false);
    expect(isMemoryTimerUrgent(MEMORY_TIMER_PHASE.CLEARED, 1000)).toBe(false);
    expect(isMemoryTimerUrgent(MEMORY_TIMER_PHASE.PLAYING, 0)).toBe(false);
  });
});

describe("memory sequence size", () => {
  it("starts at three, increases every three rounds, and caps at ten", () => {
    expect(getMemorySymbolCount(1)).toBe(3);
    expect(getMemorySymbolCount(3)).toBe(3);
    expect(getMemorySymbolCount(4)).toBe(4);
    expect(getMemorySymbolCount(100)).toBe(10);
  });

  it("runs for ten rounds", () => {
    expect(MEMORY_ORDER_ROUNDS).toBe(10);
  });
});

describe("memory progression", () => {
  it("uses larger round scores and combo multipliers", () => {
    expect(getMemoryRoundAward(3, 0)).toMatchObject({ points: 300, combo: 1 });
    expect(getMemoryRoundAward(3, 1)).toMatchObject({ points: 600, combo: 2 });
    expect(getMemoryRoundAward(3, 8)).toMatchObject({ points: 900, combo: 9 });
  });

  it("charges replay by completed rounds and consumes it before a life", () => {
    expect(chargeMemoryReplayGauge(75)).toBe(100);
    expect(resolveMemoryFailure({ lives: MEMORY_ORDER_INITIAL_LIVES, replayGauge: 100 }))
      .toEqual({ status: "replay", lives: 2, replayGauge: 0 });
  });

  it("allows two mistakes before game over", () => {
    const first = resolveMemoryFailure({ lives: MEMORY_ORDER_INITIAL_LIVES, replayGauge: 0 });
    const second = resolveMemoryFailure({ lives: first.lives, replayGauge: 0 });
    expect(first).toEqual({ status: "life", lives: 1, replayGauge: 0 });
    expect(second).toEqual({ status: "over", lives: 0, replayGauge: 0 });
  });
});
