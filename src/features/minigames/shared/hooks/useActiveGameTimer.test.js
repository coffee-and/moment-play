import { describe, expect, it } from "vitest";
import { formatActiveGameTime } from "./useActiveGameTimer.js";

describe("active game timer", () => {
  it("formats elapsed play time without showing inactive milliseconds", () => {
    expect(formatActiveGameTime(0)).toBe("00:00");
    expect(formatActiveGameTime(61_900)).toBe("01:01");
  });
});
