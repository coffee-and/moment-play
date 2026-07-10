import { describe, expect, it } from "vitest";
import { isMemoryTimerUrgent, MEMORY_TIMER_PHASE } from "./MemoryOrderGame.jsx";

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
