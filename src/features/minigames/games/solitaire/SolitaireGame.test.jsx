// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SolitaireGame } from "./SolitaireGame.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../../../../shared/audio/GameAudioContext.jsx", () => ({
  useGameAudio: () => ({
    playSound: vi.fn(),
    popDucking: vi.fn(),
    pushDucking: vi.fn(),
  }),
}));

function renderGame() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter>
      <SolitaireGame game={{ title: "Solitaire", description: "카드를 정리해요." }} />
    </MemoryRouter>,
  ));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
});

describe("SolitaireGame", () => {
  it("offers draw-one and draw-three difficulties", () => {
    const view = renderGame();
    expect(document.body.textContent).toContain("DRAW 1");
    expect(document.body.textContent).toContain("DRAW 3");
    expect(document.body.textContent).toContain("쉬움");
    expect(document.body.textContent).toContain("어려움");
    view.unmount();
  });

  it("starts with seven tableau columns and 24 stock cards", () => {
    const view = renderGame();
    const easyButton = [...document.querySelectorAll("button")].find((button) => button.textContent.includes("쉬움"));
    act(() => easyButton.click());
    expect(view.host.querySelectorAll(".solitaire-tableau-column")).toHaveLength(7);
    expect(view.host.querySelector(".solitaire-stock")?.getAttribute("aria-label")).toContain("24장");
    expect(view.host.textContent).toContain("1장씩 공개");
    view.unmount();
  });
});
