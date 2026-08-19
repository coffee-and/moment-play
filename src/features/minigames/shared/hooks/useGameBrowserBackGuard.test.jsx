// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGameBrowserBackGuard } from "./useGameBrowserBackGuard.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let latestNavigateFromGame = null;

function GuardHarness({ isOpen, onNavigate, onRequestExit }) {
  latestNavigateFromGame = useGameBrowserBackGuard({
    isExitConfirmationOpen: isOpen,
    onNavigate,
    onRequestExit,
  });
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
    latestNavigateFromGame = null;
    window.history.replaceState({}, "", "/");
  });

  it("turns a browser back event on a hash game route into an exit request", () => {
    window.history.replaceState({}, "", "/#/minigames/memory");
    const onNavigate = vi.fn();
    const onRequestExit = vi.fn();
    const view = renderGuard({ isOpen: false, onNavigate, onRequestExit });

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(onRequestExit).toHaveBeenCalledTimes(1);

    view.rerender({ isOpen: true, onNavigate, onRequestExit });
    view.rerender({ isOpen: false, onNavigate, onRequestExit });
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(onRequestExit).toHaveBeenCalledTimes(2);
    view.unmount();
  });

  it("does not intercept navigation away from non-game routes", () => {
    window.history.replaceState({}, "", "/#/games");
    const onNavigate = vi.fn();
    const onRequestExit = vi.fn();
    const view = renderGuard({ isOpen: false, onNavigate, onRequestExit });

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(onRequestExit).not.toHaveBeenCalled();
    view.unmount();
  });

  it("unwinds its guard entry before replacing the original game route", () => {
    window.history.replaceState({}, "", "/#/minigames/memory");
    const onNavigate = vi.fn();
    const onRequestExit = vi.fn();
    const view = renderGuard({ isOpen: false, onNavigate, onRequestExit });

    act(() => latestNavigateFromGame("/"));
    expect(onNavigate).not.toHaveBeenCalled();

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(onNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onRequestExit).not.toHaveBeenCalled();
    view.unmount();
  });

  it("replaces the original route directly after browser Back was confirmed", () => {
    window.history.replaceState({}, "", "/#/minigames/memory");
    const onNavigate = vi.fn();
    const onRequestExit = vi.fn();
    const view = renderGuard({ isOpen: false, onNavigate, onRequestExit });

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    act(() => latestNavigateFromGame("/"));

    expect(onRequestExit).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(onNavigate).toHaveBeenCalledTimes(1);
    view.unmount();
  });
});
