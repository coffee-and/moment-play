// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Brand } from "../components/Brand.jsx";
import { ThemeProvider } from "./ThemeContext.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { THEME, THEME_STORAGE_KEY } from "./theme.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderThemeControls() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter>
      <ThemeProvider>
        <ThemeToggle />
        <Brand />
      </ThemeProvider>
    </MemoryRouter>,
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
  it("uses the light theme by default and applies the matching logo", () => {
    const view = renderThemeControls();

    expect(document.documentElement.dataset.theme).toBe(THEME.LIGHT);
    expect(view.host.querySelector(".theme-toggle")?.getAttribute("aria-pressed")).toBe("false");
    expect(view.host.querySelector(".brand")?.getAttribute("data-variant")).toBe(THEME.LIGHT);
    view.unmount();
  });

  it("restores, switches, and persists the selected theme", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, THEME.DARK);
    const view = renderThemeControls();
    const toggle = view.host.querySelector(".theme-toggle");

    expect(document.documentElement.dataset.theme).toBe(THEME.DARK);
    expect(toggle?.getAttribute("aria-label")).toBe("라이트 테마로 전환");
    expect(view.host.querySelector(".brand")?.getAttribute("data-variant")).toBe(THEME.DARK);

    act(() => toggle.click());

    expect(document.documentElement.dataset.theme).toBe(THEME.LIGHT);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(THEME.LIGHT);
    expect(view.host.querySelector(".brand")?.getAttribute("data-variant")).toBe(THEME.LIGHT);
    view.unmount();
  });
});
