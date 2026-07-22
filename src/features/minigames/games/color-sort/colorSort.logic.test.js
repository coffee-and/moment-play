import { describe, expect, it } from "vitest";
import {
  COLOR_SORT_CAPACITY,
  COLOR_SORT_PALETTE,
  createColorSortBoard,
  getColorSortLevel,
  isColorSortSolved,
  moveColorBlocks,
} from "./colorSort.logic.js";

describe("Color Sort logic", () => {
  it("grows from four to eight colors with two empty tubes", () => {
    expect(getColorSortLevel(1)).toMatchObject({ colorCount: 4, tubeCount: 6, emptyTubes: 2 });
    expect(getColorSortLevel(5)).toMatchObject({ colorCount: 8, tubeCount: 10, emptyTubes: 2 });
    expect(COLOR_SORT_PALETTE).toHaveLength(8);
    expect(new Set(COLOR_SORT_PALETTE.map((color) => color.value)).size).toBe(8);
    expect(COLOR_SORT_PALETTE.every((color) => color.value.includes("var(--palette-"))).toBe(true);
  });

  it("moves the contiguous top group only onto an empty or matching color", () => {
    const board = [["yellow", "burgundy", "burgundy"], ["burgundy"], [], []];
    const matching = moveColorBlocks(board, 0, 1);
    expect(matching.moved).toBe(2);
    expect(matching.tubes).toEqual([["yellow"], ["burgundy", "burgundy", "burgundy"], [], []]);
    expect(moveColorBlocks(board, 0, 2).moved).toBe(2);
    expect(moveColorBlocks(board, 0, 3, 0).moved).toBe(0);
    expect(moveColorBlocks(board, 0, 0).moved).toBe(0);
  });

  it("creates deterministic mixed boards with the correct block count", () => {
    const first = createColorSortBoard(5, 1234);
    const second = createColorSortBoard(5, 1234);
    expect(first).toEqual(second);
    expect(first).toHaveLength(10);
    expect(first.flat()).toHaveLength(8 * COLOR_SORT_CAPACITY);
    expect(first.filter((tube) => tube.length === 0)).toHaveLength(2);
    expect(isColorSortSolved(first)).toBe(false);
  });

  it("recognizes completed boards", () => {
    expect(isColorSortSolved([["yellow", "yellow", "yellow", "yellow"], [], []])).toBe(true);
    expect(isColorSortSolved([["yellow", "burgundy", "yellow", "burgundy"], [], []])).toBe(false);
  });
});
