// @vitest-environment jsdom
import React, { act } from "react";
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

describe("FlappyGame", () => {
  it("does not render or persist a fish picker", () => {
    const view = renderGame();

    expect(document.body.querySelector('[role="radiogroup"]')).toBeNull();
    expect(findButton(document.body, "노란 물고기")).toBeUndefined();
    expect(findButton(document.body, "파란 고래")).toBeUndefined();
    expect(window.localStorage.getItem("eunContents.flappy.fishSkin")).toBeNull();
    view.unmount();
  });

  it("supports keyboard and pointer controls and uses the shared pause modal", () => {
    const view = renderGame();
    const surface = view.host.querySelector('[role="application"]');

    expect(surface.tabIndex).toBe(0);

    act(() => surface.focus());
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
    expect(document.body.querySelector("[data-game-stage-modal]")).not.toBeNull();
    expect(document.body.textContent).toContain("잠시 쉬어갈까요?");

    act(() => findButton(document.body, "계속하기").click());
    expect(findButton(view.host, "일시정지")).toBeDefined();

    view.unmount();
  });
});
