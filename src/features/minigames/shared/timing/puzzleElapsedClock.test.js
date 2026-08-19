import { describe, expect, it } from "vitest";
import { createPuzzleElapsedClock } from "./puzzleElapsedClock.js";

describe("createPuzzleElapsedClock", () => {
  it("preserves sub-second elapsed time across repeated pauses", () => {
    let now = 1_000;
    const clock = createPuzzleElapsedClock(() => now);

    clock.resetAndStart();
    now = 2_499;
    expect(clock.pause()).toBe(1_499);

    now = 5_000;
    clock.resume();
    now = 5_502;
    expect(clock.pause()).toBe(2_001);
  });
});
