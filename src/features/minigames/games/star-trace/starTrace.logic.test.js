import { describe, expect, it } from "vitest";
import { createStarTracePuzzle, evaluateStarTraceChoice } from "./starTrace.logic.js";

describe("star trace logic", () => {
  it("creates deterministic constellations for each difficulty", () => {
    expect(createStarTracePuzzle("easy", 1)).toEqual(createStarTracePuzzle("easy", 1));
    expect(createStarTracePuzzle("easy", 1).points).toHaveLength(5);
    expect(createStarTracePuzzle("hard", 1).points).toHaveLength(10);
  });

  it("only advances when the next star is selected", () => {
    expect(evaluateStarTraceChoice(1, 3, 5)).toEqual({ correct: false, complete: false, nextIndex: 1 });
    expect(evaluateStarTraceChoice(4, 4, 5)).toEqual({ correct: true, complete: true, nextIndex: 5 });
  });
});
