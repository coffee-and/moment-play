// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { clearMomentPlayLocalData } from "./localDataSettings.js";

afterEach(() => {
  window.localStorage.clear();
});

describe("clearMomentPlayLocalData", () => {
  it("removes all Moment Play data, including legacy theme preferences", () => {
    window.localStorage.setItem("eunContents.settings.preferences", "legacy-theme-preferences");
    window.localStorage.setItem("eunContents.game.2048", "record");
    window.localStorage.setItem("eunContents.omok.nickname", "nickname");
    window.localStorage.setItem("unrelated.key", "keep");

    expect(clearMomentPlayLocalData()).toBe(3);
    expect(window.localStorage.getItem("eunContents.settings.preferences")).toBeNull();
    expect(window.localStorage.getItem("eunContents.game.2048")).toBeNull();
    expect(window.localStorage.getItem("eunContents.omok.nickname")).toBeNull();
    expect(window.localStorage.getItem("unrelated.key")).toBe("keep");
  });

  it("removes a legacy theme preference even when it is the only Moment Play data", () => {
    window.localStorage.setItem("eunContents.settings.preferences", "legacy-theme-preferences");
    expect(clearMomentPlayLocalData()).toBe(1);
    expect(window.localStorage.getItem("eunContents.settings.preferences")).toBeNull();
  });
});
