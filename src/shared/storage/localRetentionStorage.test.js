// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { readRetainedData, touchRetainedData, writeRetainedData } from "./localRetentionStorage.js";

const KEY = "eunContents.test.retention";
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

beforeEach(() => {
  window.localStorage.clear();
});

describe("localRetentionStorage", () => {
  it("returns data that is still within the retention window", () => {
    writeRetainedData(KEY, { nickname: "Sunny" });

    expect(readRetainedData(KEY, { maxAgeMs: SIXTY_DAYS_MS })).toEqual({ nickname: "Sunny" });
  });

  it("treats data older than the retention window as expired and clears it", () => {
    const expiredEnvelope = {
      data: { nickname: "Old" },
      lastActiveAt: Date.now() - (SIXTY_DAYS_MS + 1000),
      version: 1,
    };
    window.localStorage.setItem(KEY, JSON.stringify(expiredEnvelope));

    expect(readRetainedData(KEY, { maxAgeMs: SIXTY_DAYS_MS })).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("returns null for malformed JSON instead of throwing", () => {
    window.localStorage.setItem(KEY, "{not json");

    expect(() => readRetainedData(KEY, { maxAgeMs: SIXTY_DAYS_MS })).not.toThrow();
    expect(readRetainedData(KEY, { maxAgeMs: SIXTY_DAYS_MS })).toBeNull();
  });

  it("returns null when localStorage is unavailable", () => {
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("storage unavailable");
      },
    });

    expect(() => readRetainedData(KEY, { maxAgeMs: SIXTY_DAYS_MS })).not.toThrow();
    expect(readRetainedData(KEY, { maxAgeMs: SIXTY_DAYS_MS })).toBeNull();

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
  });

  it("touchRetainedData refreshes lastActiveAt without changing the stored data", () => {
    const staleEnvelope = {
      data: { nickname: "Sunny" },
      lastActiveAt: Date.now() - 1000,
      version: 1,
    };
    window.localStorage.setItem(KEY, JSON.stringify(staleEnvelope));

    touchRetainedData(KEY);

    const updated = JSON.parse(window.localStorage.getItem(KEY));
    expect(updated.data).toEqual({ nickname: "Sunny" });
    expect(updated.lastActiveAt).toBeGreaterThan(staleEnvelope.lastActiveAt);
  });
});
