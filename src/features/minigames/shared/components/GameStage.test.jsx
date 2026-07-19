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
});
