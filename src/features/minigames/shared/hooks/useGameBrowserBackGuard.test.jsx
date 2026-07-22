// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGameBrowserBackGuard } from "./useGameBrowserBackGuard.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function GuardHarness({ isOpen, onRequestExit }) {
  useGameBrowserBackGuard({ isExitConfirmationOpen: isOpen, onRequestExit });
  return null;
}

function renderGuard(props) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  act(() => root.render(<GuardHarness {...props} />));
  return {
    rerender(nextProps) {
      act(() => root.render(<GuardHarness {...nextProps} />));
    },
    unmount() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

describe("useGameBrowserBackGuard", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("turns a browser back event on a hash game route into an exit request", () => {
    window.history.replaceState({}, "", "/#/minigames/memory");
    const onRequestExit = vi.fn();
    const view = renderGuard({ isOpen: false, onRequestExit });

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(onRequestExit).toHaveBeenCalledTimes(1);

    view.rerender({ isOpen: true, onRequestExit });
    view.rerender({ isOpen: false, onRequestExit });
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(onRequestExit).toHaveBeenCalledTimes(2);
    view.unmount();
  });

  it("does not intercept navigation away from non-game routes", () => {
    window.history.replaceState({}, "", "/#/games");
    const onRequestExit = vi.fn();
    const view = renderGuard({ isOpen: false, onRequestExit });

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(onRequestExit).not.toHaveBeenCalled();
    view.unmount();
  });
});
