// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { clearMomentPlayLocalData } from "./localDataSettings.js";
import { SETTINGS_STORAGE_KEY } from "./settingsStorage.js";

afterEach(() => {
  window.localStorage.clear();
});

describe("clearMomentPlayLocalData", () => {
  it("removes Moment Play data while preserving preferences and unrelated storage", () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, "preferences");
    window.localStorage.setItem("eunContents.game.2048", "record");
    window.localStorage.setItem("eunContents.omok.nickname", "nickname");
    window.localStorage.setItem("unrelated.key", "keep");

    expect(clearMomentPlayLocalData()).toBe(2);
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe("preferences");
    expect(window.localStorage.getItem("eunContents.game.2048")).toBeNull();
    expect(window.localStorage.getItem("eunContents.omok.nickname")).toBeNull();
    expect(window.localStorage.getItem("unrelated.key")).toBe("keep");
  });

  it("returns zero when there is no removable Moment Play data", () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, "preferences");
    expect(clearMomentPlayLocalData()).toBe(0);
  });
});
