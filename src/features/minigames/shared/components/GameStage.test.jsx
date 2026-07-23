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
  it("draws shared pointer feedback at the touched point on an interactive game surface", () => {
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

    const stage = host.querySelector(".game-stage");
    expect(stage.classList.contains("has-touch-feedback")).toBe(true);
    expect(stage.style.getPropertyValue("--game-touch-x")).toBe("20px");
    expect(stage.style.getPropertyValue("--game-touch-y")).toBe("30px");
    act(() => root.unmount());
  });

});
