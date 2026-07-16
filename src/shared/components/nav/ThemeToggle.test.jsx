// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let theme = "dark";
const toggleTheme = vi.fn();

vi.mock("../../theme/ThemeContext.jsx", () => ({
  useTheme: () => ({ theme, toggleTheme }),
}));

const { ThemeToggle } = await import("./ThemeToggle.jsx");

function renderToggle() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const render = () => act(() => root.render(<ThemeToggle />));
  render();
  return { host, render, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
  theme = "dark";
  toggleTheme.mockClear();
});

describe("ThemeToggle", () => {
  it("shows the sun as the action that switches dark mode to light", () => {
    const view = renderToggle();
    const button = view.host.querySelector('button[aria-label="라이트 모드로 전환"]');
    expect(button?.classList.contains("is-light-target")).toBe(true);
    act(() => button.click());
    expect(toggleTheme).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("shows the moon as the action that switches light mode to dark", () => {
    theme = "light";
    const view = renderToggle();
    const button = view.host.querySelector('button[aria-label="다크 모드로 전환"]');
    expect(button?.classList.contains("is-dark-target")).toBe(true);
    view.unmount();
  });
});
