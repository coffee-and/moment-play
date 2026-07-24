/** @vitest-environment jsdom */
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { usePuzzleHints } from "./usePuzzleHints.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let latestHint = null;

function HintHarness({ steps }) {
  latestHint = usePuzzleHints(steps);
  return null;
}

function renderHints(steps) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  act(() => {
    root.render(<HintHarness steps={steps} />);
  });

  return {
    unmount() {
      act(() => root.unmount());
      host.remove();
      latestHint = null;
    },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  latestHint = null;
});

describe("usePuzzleHints", () => {
  it("clears the visible hint and board target when the board changes while preserving usage", () => {
    const steps = [
      { message: "첫 번째 힌트", targetIndexes: [1, 2] },
      { message: "두 번째 힌트", targetIndexes: [3] },
    ];
    const view = renderHints(steps);

    act(() => latestHint.acceptHint());
    expect(latestHint.hasUsedHint).toBe(true);
    expect(latestHint.isOpen).toBe(true);
    expect(latestHint.currentStep).toEqual(steps[0]);

    act(() => latestHint.viewOnBoard());
    expect(latestHint.isOpen).toBe(false);
    expect(latestHint.currentStep).toEqual(steps[0]);

    act(() => latestHint.resetHintSteps());
    expect(latestHint.hasUsedHint).toBe(true);
    expect(latestHint.isOpen).toBe(false);
    expect(latestHint.currentStep).toBeNull();

    act(() => latestHint.requestHint());
    expect(latestHint.isOpen).toBe(true);
    expect(latestHint.currentStep).toEqual(steps[0]);

    view.unmount();
  });

  it("fully resets hint usage for a new round", () => {
    const steps = [{ message: "힌트", targetIndexes: [0] }];
    const view = renderHints(steps);

    act(() => latestHint.acceptHint());
    act(() => latestHint.resetHints());

    expect(latestHint.hasUsedHint).toBe(false);
    expect(latestHint.isOpen).toBe(false);
    expect(latestHint.currentStep).toBeNull();
    expect(latestHint.stepIndex).toBe(0);

    view.unmount();
  });
});
