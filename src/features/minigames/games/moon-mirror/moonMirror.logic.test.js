import { describe, expect, it } from "vitest";
import { createMoonMirrorPuzzle, getMirrorCell, isMoonMirrorSolved } from "./moonMirror.logic.js";

describe("moon mirror logic", () => {
  it("mirrors cells across each supported axis", () => {
    expect(getMirrorCell(0, 4, "vertical")).toBe(3);
    expect(getMirrorCell(1, 4, "horizontal")).toBe(13);
    expect(getMirrorCell(9, 4, "diagonal")).toBe(6);
  });

  it("creates larger boards as difficulty rises", () => {
    expect(createMoonMirrorPuzzle("easy", 1).size).toBe(4);
    expect(createMoonMirrorPuzzle("normal", 1).size).toBe(6);
    expect(createMoonMirrorPuzzle("hard", 1).size).toBe(8);
  });

  it("accepts exactly the mirrored target pattern", () => {
    expect(isMoonMirrorSolved(new Set([2, 4]), [4, 2])).toBe(true);
    expect(isMoonMirrorSolved(new Set([2]), [2, 4])).toBe(false);
  });
});
