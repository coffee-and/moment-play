import { describe, expect, it } from "vitest";
import { isNewGameRecord, RECORD_DIRECTION } from "./gameRecord.js";

describe("game record comparison", () => {
  it("recognizes a strictly higher score and rejects a tie", () => {
    expect(isNewGameRecord({ previous: 120, next: 121 })).toBe(true);
    expect(isNewGameRecord({ previous: 120, next: 120 })).toBe(false);
    expect(isNewGameRecord({ previous: 120, next: 119 })).toBe(false);
  });

  it("recognizes a strictly faster time and treats the first result as a record", () => {
    expect(isNewGameRecord({ previous: 48, next: 47, direction: RECORD_DIRECTION.LOWER })).toBe(true);
    expect(isNewGameRecord({ previous: 48, next: 48, direction: RECORD_DIRECTION.LOWER })).toBe(false);
    expect(isNewGameRecord({ previous: null, next: 82, direction: RECORD_DIRECTION.LOWER })).toBe(true);
  });
});
