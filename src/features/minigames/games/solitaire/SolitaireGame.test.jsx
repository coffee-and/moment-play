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
  it("applies draw-three after the player chooses hard mode", () => {
    const view = renderGame();
    const hardButton = [...document.querySelectorAll("button")]
      .find((button) => button.textContent.includes("어려움"));
    act(() => hardButton.click());
    const stock = view.host.querySelector('button[aria-label="스톡 24장, 카드 공개"]');
    act(() => stock.click());
    expect(view.host.querySelector('button[aria-label="스톡 21장, 카드 공개"]')).not.toBeNull();
    expect(view.host.textContent).toContain("3장씩 공개");
    view.unmount();
  });

  it("draws one card after the player chooses easy mode", () => {
    const view = renderGame();
    const easyButton = [...document.querySelectorAll("button")].find((button) => button.textContent.includes("쉬움"));
    act(() => easyButton.click());
    const stock = view.host.querySelector('button[aria-label="스톡 24장, 카드 공개"]');
    act(() => stock.click());
    expect(view.host.querySelector('button[aria-label="스톡 23장, 카드 공개"]')).not.toBeNull();
    view.unmount();
  });
});
