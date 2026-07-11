import { describe, expect, it } from "vitest";
import { isMemoryTimerUrgent, MEMORY_TIMER_PHASE } from "./MemoryOrderGame.jsx";
import { getMemorySymbolCount } from "./memoryOrder.logic.js";

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
});
