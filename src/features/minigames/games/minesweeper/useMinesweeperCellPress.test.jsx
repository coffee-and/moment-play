/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMinesweeperCellPress } from "./useMinesweeperCellPress.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function CellPressHarness({ isEnabled, onFlag, onReveal }) {
  const cellPress = useMinesweeperCellPress({ isEnabled, onFlag, onReveal });
  return <button {...cellPress.getCellHandlers(4)} type="button">cell</button>;
}

function renderCellPress(props) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<CellPressHarness {...props} />));
  return {
    button: host.querySelector("button"),
    rerender(nextProps) {
      act(() => root.render(<CellPressHarness {...nextProps} />));
    },
    unmount() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

function dispatchPointer(element, type, properties = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const values = {
    clientX: 0,
    clientY: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType: "touch",
    ...properties,
  };
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, { configurable: true, value });
  }
  act(() => element.dispatchEvent(event));
}

function dispatchContextMenu(element, pointerType) {
  const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
  if (pointerType) Object.defineProperty(event, "pointerType", { value: pointerType });
  act(() => element.dispatchEvent(event));
}

describe("useMinesweeperCellPress", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("flags once on a long press and suppresses its follow-up context menu and click", () => {
    const onFlag = vi.fn();
    const onReveal = vi.fn();
    const view = renderCellPress({ isEnabled: true, onFlag, onReveal });

    dispatchPointer(view.button, "pointerdown");
    act(() => vi.advanceTimersByTime(480));
    act(() => vi.advanceTimersByTime(2_000));
    dispatchContextMenu(view.button);
    dispatchPointer(view.button, "pointerup");
    act(() => view.button.click());

    expect(onFlag).toHaveBeenCalledTimes(1);
    expect(onFlag).toHaveBeenCalledWith(4);
    expect(onReveal).not.toHaveBeenCalled();

    dispatchPointer(view.button, "pointerdown", { pointerId: 2 });
    dispatchPointer(view.button, "pointerup", { pointerId: 2 });
    act(() => view.button.click());
    expect(onReveal).toHaveBeenCalledWith(4);
    view.unmount();
  });

  it("cancels a pending long press when touch moves away or the pointer is cancelled", () => {
    const onFlag = vi.fn();
    const view = renderCellPress({ isEnabled: true, onFlag, onReveal: vi.fn() });

    dispatchPointer(view.button, "pointerdown");
    dispatchPointer(view.button, "pointermove", { clientX: 20 });
    act(() => vi.advanceTimersByTime(480));

    dispatchPointer(view.button, "pointerdown", { pointerId: 2 });
    dispatchPointer(view.button, "pointercancel", { pointerId: 2 });
    act(() => vi.advanceTimersByTime(480));

    dispatchPointer(view.button, "pointerdown", { pointerId: 3 });
    act(() => window.dispatchEvent(new Event("blur")));
    act(() => vi.advanceTimersByTime(480));

    expect(onFlag).not.toHaveBeenCalled();
    view.unmount();
  });

  it("keeps desktop context menu flagging independent from the next click", () => {
    const onFlag = vi.fn();
    const onReveal = vi.fn();
    const view = renderCellPress({ isEnabled: true, onFlag, onReveal });

    dispatchContextMenu(view.button, "mouse");
    act(() => view.button.click());

    expect(onFlag).toHaveBeenCalledWith(4);
    expect(onReveal).toHaveBeenCalledWith(4);
    view.unmount();
  });

  it("suppresses a click when a touch context menu arrives after pointer up", () => {
    const onFlag = vi.fn();
    const onReveal = vi.fn();
    const view = renderCellPress({ isEnabled: true, onFlag, onReveal });

    dispatchPointer(view.button, "pointerdown");
    dispatchPointer(view.button, "pointerup");
    dispatchContextMenu(view.button, "touch");
    act(() => view.button.click());

    expect(onFlag).toHaveBeenCalledWith(4);
    expect(onReveal).not.toHaveBeenCalled();
    view.unmount();
  });

  it("clears pending work when interaction is disabled or the component unmounts", () => {
    const onFlag = vi.fn();
    const onReveal = vi.fn();
    const view = renderCellPress({ isEnabled: true, onFlag, onReveal });

    dispatchPointer(view.button, "pointerdown");
    view.rerender({ isEnabled: false, onFlag, onReveal });
    act(() => vi.advanceTimersByTime(480));
    expect(onFlag).not.toHaveBeenCalled();

    view.rerender({ isEnabled: true, onFlag, onReveal });
    dispatchPointer(view.button, "pointerdown", { pointerId: 2 });
    view.unmount();
    act(() => vi.advanceTimersByTime(480));
    expect(onFlag).not.toHaveBeenCalled();
  });
});
