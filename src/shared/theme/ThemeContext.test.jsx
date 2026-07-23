// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "./ThemeContext.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { THEME, THEME_STORAGE_KEY } from "./theme.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderThemeControls() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  ));
  return { host, unmount: () => act(() => root.unmount()) };
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("style");
});

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("style");
});

describe("ThemeProvider", () => {
  it("restores, switches, and persists the selected theme", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, THEME.DARK);
    const view = renderThemeControls();
    const toggle = view.host.querySelector('button[aria-label="라이트 테마로 전환"]');

    expect(document.documentElement.dataset.theme).toBe(THEME.DARK);
    expect(toggle).not.toBeNull();

    act(() => toggle.click());

    expect(document.documentElement.dataset.theme).toBe(THEME.LIGHT);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(THEME.LIGHT);
    expect(toggle.getAttribute("aria-label")).toBe("다크 테마로 전환");
    view.unmount();
  });
});
