// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlappyGame } from "./FlappyGame.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const game = {
  description: "별빛 사이를 날아 보세요.",
  title: "별빛 비행",
};

function findButton(host, label) {
  return [...host.querySelectorAll("button")].find((button) => button.textContent === label);
}

function renderGame() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  act(() => root.render(
    <MemoryRouter>
      <FlappyGame game={game} />
    </MemoryRouter>,
  ));

  return {
    host,
    unmount() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("FlappyGame input surface", () => {
  it("renders one clean crescent path and separate body, tail, and fin SVG layers", () => {
    const view = renderGame();
    const moon = view.host.querySelector("svg.flappy-game__moon");
    const fish = view.host.querySelector(".flappy-game__bird .flappy-fish-svg");

    expect(moon).not.toBeNull();
    expect(moon.querySelectorAll("path")).toHaveLength(1);
    expect(moon.querySelectorAll("circle")).toHaveLength(0);
    expect(fish?.dataset.skin).toBe("blue");
    expect(fish?.querySelector("svg.flappy-fish-svg__body")).not.toBeNull();
    expect(fish?.querySelector("svg.flappy-fish-svg__tail")).not.toBeNull();
    expect(fish?.querySelector("svg.flappy-fish-svg__wing")).not.toBeNull();
    view.unmount();
  });

  it("lets the player choose and persist the yellow fish with its matching fin", () => {
    const view = renderGame();
    const yellowOption = findButton(document.body, "노란 물고기");

    expect(yellowOption).toBeDefined();
    expect(yellowOption.getAttribute("aria-checked")).toBe("false");

    act(() => yellowOption.click());

    expect(yellowOption.getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem("eunContents.flappy.fishSkin")).toBe("yellow");
    expect(view.host.querySelector(".flappy-game__bird .flappy-fish-svg")?.dataset.skin).toBe("yellow");
    view.unmount();
  });

  it("keeps pointer and keyboard controls while preserving a keyboard-focusable surface", () => {
    const view = renderGame();
    const surface = view.host.querySelector('[role="application"]');

    expect(surface.getAttribute("role")).toBe("application");
    expect(surface.tabIndex).toBe(0);

    act(() => surface.focus());
    expect(document.activeElement).toBe(surface);

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: " ",
    })));
    expect(findButton(view.host, "일시정지")).toBeDefined();

    act(() => surface.dispatchEvent(new MouseEvent("pointerdown", {
      bubbles: true,
      button: 0,
    })));
    expect(findButton(view.host, "일시정지")).toBeDefined();

    act(() => findButton(view.host, "일시정지").click());
    expect(findButton(view.host, "계속하기")).toBeDefined();

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    })));
    expect(findButton(view.host, "일시정지")).toBeDefined();

    view.unmount();
  });
});
