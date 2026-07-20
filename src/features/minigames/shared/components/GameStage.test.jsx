// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { GameStage } from "./GameStage.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("GameStage", () => {
  it("keeps game content in the shared play/content layout without a fullscreen control", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(<GameStage title="Test game"><div data-testid="game-body">Body</div></GameStage>));

    const gameBody = host.querySelector('[data-testid="game-body"]');
    expect(gameBody.closest(".game-stage__content")).not.toBeNull();
    expect(gameBody.closest(".game-stage__play")).not.toBeNull();
    expect(host.querySelector('[aria-label="Expand game"]')).toBeNull();
    act(() => root.unmount());
  });

  it("places shared game actions in the top bar", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const actions = (
      <div className="game-stage__inline-actions">
        <button type="button">New game</button>
        <button type="button">Exit game</button>
      </div>
    );

    act(() => root.render(<GameStage title="Test game" actions={actions}><div>Body</div></GameStage>));
    expect(host.querySelector(".game-stage__topbar-game-actions")?.textContent).toContain("Exit game");
    act(() => root.unmount());
  });

  it("does not draw shared pointer feedback over an interactive game surface", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    act(() => root.render(
      <GameStage title="Test game">
        <div role="application" tabIndex={0}>Interactive surface</div>
      </GameStage>,
    ));

    const surface = host.querySelector('[role="application"]');
    act(() => surface.dispatchEvent(new MouseEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 20,
      clientY: 30,
    })));

    expect(host.querySelector(".game-stage").classList.contains("has-touch-feedback")).toBe(false);
    act(() => root.unmount());
  });

  it("keeps shared pointer feedback for ordinary stage controls", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    act(() => root.render(
      <GameStage title="Test game">
        <button type="button">Stage action</button>
      </GameStage>,
    ));

    const action = host.querySelector(".game-stage__content button");
    act(() => action.dispatchEvent(new MouseEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: 20,
      clientY: 30,
    })));

    expect(host.querySelector(".game-stage").classList.contains("has-touch-feedback")).toBe(true);
    act(() => root.unmount());
  });
});
