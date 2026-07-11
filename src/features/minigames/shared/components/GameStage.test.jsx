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
  it("keeps game content in the shared play/content layout and preserves Expand", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(<GameStage title="Test game" fullscreenEnabled><div data-testid="game-body">Body</div></GameStage>));

    const gameBody = host.querySelector('[data-testid="game-body"]');
    expect(gameBody.closest(".game-stage__content")).not.toBeNull();
    expect(gameBody.closest(".game-stage__play")).not.toBeNull();
    expect(host.querySelector('[aria-label="Expand game"]')).not.toBeNull();
    act(() => root.unmount());
  });
});
