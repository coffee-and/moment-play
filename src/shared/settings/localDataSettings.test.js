// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  GAME_RECORD_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  RESETTABLE_LOCAL_DATA_KEYS,
} from "../storage/localStorageRegistry.js";
import { clearMomentPlayLocalData } from "./localDataSettings.js";

afterEach(() => {
  window.localStorage.clear();
});

describe("clearMomentPlayLocalData", () => {
  it("removes every registered game record and legacy play-data key", () => {
    RESETTABLE_LOCAL_DATA_KEYS.forEach((key) => window.localStorage.setItem(key, "stored-data"));
    window.localStorage.setItem("eunContents.legacy.playData", "legacy-data");
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, "dark");
    window.localStorage.setItem("unrelated.key", "keep");

    expect(clearMomentPlayLocalData()).toBe(RESETTABLE_LOCAL_DATA_KEYS.length + 1);
    RESETTABLE_LOCAL_DATA_KEYS.forEach((key) => expect(window.localStorage.getItem(key)).toBeNull());
    expect(window.localStorage.getItem("eunContents.legacy.playData")).toBeNull();
    expect(window.localStorage.getItem(LOCAL_STORAGE_KEYS.THEME)).toBe("dark");
    expect(window.localStorage.getItem("unrelated.key")).toBe("keep");
  });

  it("removes the non-namespaced Solitaire record through the registry", () => {
    window.localStorage.setItem(GAME_RECORD_STORAGE_KEYS.SOLITAIRE_RECORDS, "record");
    expect(clearMomentPlayLocalData()).toBe(1);
    expect(window.localStorage.getItem(GAME_RECORD_STORAGE_KEYS.SOLITAIRE_RECORDS)).toBeNull();
  });
});
