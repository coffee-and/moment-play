import { describe, expect, it } from "vitest";
import { buildAuthRoute, sanitizeReturnTo } from "./returnTo.js";

describe("sanitizeReturnTo", () => {
  it.each([
    "/",
    "/minigames",
    "/minigames/omok",
    "/minigames/omok/room/room-1",
    "/ranking",
    "/friends",
    "/settings",
    "/minigames/sudoku?difficulty=easy#guide",
  ])("accepts internal Moment Play path %s", (path) => {
    expect(sanitizeReturnTo(path)).toBe(path);
  });

  it.each([
    "https://attacker.example/",
    "http://attacker.example/",
    "//attacker.example/",
    "javascript:alert(1)",
    "data:text/html,bad",
    "/\\attacker.example/",
    "/%2F%2Fattacker.example/",
    " /settings",
    "/settings%",
    "",
  ])("rejects unsafe or malformed return path %s", (path) => {
    expect(sanitizeReturnTo(path)).toBe("/");
  });

  it("encodes the internal path as one login query parameter", () => {
    expect(buildAuthRoute("/login", "/minigames/omok?mode=online")).toBe(
      "/login?returnTo=%2Fminigames%2Fomok%3Fmode%3Donline",
    );
  });
});
