// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameStageModal, GameStageOverlay } from "./GameStageOverlay.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderOverlay(props = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <GameStageOverlay state="test" {...props}>
      <GameStageModal role="dialog" aria-modal="true" aria-labelledby="overlay-title">
        <h2 id="overlay-title">Modal title</h2>
        <button type="button">Confirm</button>
      </GameStageModal>
    </GameStageOverlay>,
  ));
  return () => act(() => {
    root.unmount();
    host.remove();
  });
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("GameStageOverlay", () => {
  it("portals outside the render host and restores body scrolling", () => {
    const unmount = renderOverlay();
    expect(document.body.querySelector(":scope > .game-stage-overlay")).not.toBeNull();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.querySelector('[role="dialog"]').getAttribute("aria-modal")).toBe("true");
    expect(document.querySelector(".game-stage-modal__decoration")).not.toBeNull();
    expect(document.querySelector(".game-stage-modal__stars")).not.toBeNull();
    expect(document.querySelector(".game-stage-modal img")).toBeNull();
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes with Escape or backdrop only when configured", () => {
    const onClose = vi.fn();
    const unmount = renderOverlay({ closeOnBackdrop: true, closeOnEscape: true, onClose });
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    act(() => document.querySelector(".game-stage-overlay").dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("annotates modal action groups with their rendered action count", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(
      <GameStageModal>
        <div className="game-stage-modal__actions">
          <button type="button">Primary</button>
          <button type="button">Secondary</button>
          <button type="button">Exit</button>
        </div>
      </GameStageModal>,
    ));

    expect(host.querySelector(".game-stage-modal__actions").dataset.actionCount).toBe("3");
    act(() => root.unmount());
  });
});
