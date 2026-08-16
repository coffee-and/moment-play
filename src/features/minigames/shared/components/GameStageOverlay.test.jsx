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
        <button type="button" autoFocus>Confirm</button>
        <button type="button">Cancel</button>
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
  it("portals an accessible modal, makes the background inert, and restores document state", () => {
    const background = document.createElement("main");
    const openButton = document.createElement("button");
    background.appendChild(openButton);
    document.body.appendChild(background);
    openButton.focus();
    const unmount = renderOverlay();

    expect(document.body.style.overflow).toBe("hidden");
    expect(background.hasAttribute("inert")).toBe(true);
    expect(document.querySelector('[role="dialog"]').getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement.textContent).toBe("Confirm");

    unmount();

    expect(document.body.style.overflow).toBe("");
    expect(background.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(openButton);
  });

  it("closes with Escape or backdrop only when configured", () => {
    const onClose = vi.fn();
    const unmount = renderOverlay({ closeOnBackdrop: true, closeOnEscape: true, onClose });
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    act(() => document.querySelector('[role="dialog"]').parentElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("keeps keyboard focus inside the active modal", () => {
    const unmount = renderOverlay();
    const [confirmButton, cancelButton] = document.querySelectorAll('[role="dialog"] button');

    act(() => cancelButton.focus());
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })));
    expect(document.activeElement).toBe(confirmButton);

    act(() => confirmButton.focus());
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
    })));
    expect(document.activeElement).toBe(cancelButton);

    unmount();
  });

  it("keeps scroll locked and restores focus correctly across nested modals", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    document.body.style.overflow = "clip";
    const root = createRoot(host);
    const onNestedClose = vi.fn();

    function NestedOverlayHarness() {
      const [isNestedOpen, setIsNestedOpen] = React.useState(false);

      return (
        <>
          <GameStageOverlay state="primary">
            <GameStageModal role="dialog" aria-modal="true" aria-label="Primary modal">
              <button type="button" onClick={() => setIsNestedOpen(true)}>Open nested</button>
              <button type="button">Primary action</button>
            </GameStageModal>
          </GameStageOverlay>
          {isNestedOpen ? (
            <GameStageOverlay
              state="nested"
              closeOnEscape
              onClose={() => {
                onNestedClose();
                setIsNestedOpen(false);
              }}
            >
              <GameStageModal role="dialog" aria-modal="true" aria-label="Nested modal">
                <button type="button">Nested action</button>
              </GameStageModal>
            </GameStageOverlay>
          ) : null}
        </>
      );
    }

    act(() => root.render(<NestedOverlayHarness />));
    const openNestedButton = document.activeElement;
    act(() => openNestedButton.click());

    let modalLayers = document.querySelectorAll("[data-modal-layer]");
    expect(modalLayers).toHaveLength(2);
    expect(modalLayers[0].hasAttribute("inert")).toBe(true);
    expect(modalLayers[1].hasAttribute("inert")).toBe(false);
    expect(document.activeElement.textContent).toBe("Nested action");
    expect(document.body.style.overflow).toBe("hidden");

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));

    modalLayers = document.querySelectorAll("[data-modal-layer]");
    expect(onNestedClose).toHaveBeenCalledTimes(1);
    expect(modalLayers).toHaveLength(1);
    expect(modalLayers[0].hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(openNestedButton);
    expect(document.body.style.overflow).toBe("hidden");

    act(() => root.unmount());
    host.remove();
    expect(document.body.style.overflow).toBe("clip");
  });
});
