// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { GameRecordCelebration } from "./GameRecordCelebration.jsx";
import { GameStageModal } from "./GameStageOverlay.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function render(element) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("shared game celebration", () => {
  it("renders one shared celebration for a completed modal", () => {
    const view = render(
      React.createElement(
        GameStageModal,
        { showCompletionStars: true, celebrationStreak: 3 },
        React.createElement(GameRecordCelebration, { isNewRecord: true }),
        React.createElement("h2", null, "완료"),
      ),
    );

    expect(view.host.querySelectorAll('[data-doodle-variant="record"]')).toHaveLength(1);
    expect(view.host.querySelector(".completion-stars")).not.toBeNull();
    act(() => view.root.unmount());
  });

  it("renders a standalone celebration only for a new record", () => {
    const recordView = render(React.createElement(GameRecordCelebration, { isNewRecord: true }));
    expect(recordView.host.querySelector('[data-doodle-variant="record"]')).not.toBeNull();
    act(() => recordView.root.unmount());

    const normalView = render(React.createElement(GameRecordCelebration, { isNewRecord: false }));
    expect(normalView.host.querySelector('[data-doodle-variant="record"]')).toBeNull();
    act(() => normalView.root.unmount());
  });

  it("can expose victory artwork without completion particles", () => {
    const view = render(
      React.createElement(
        GameStageModal,
        { showCelebration: true },
        React.createElement(GameRecordCelebration, { isNewRecord: false }),
        React.createElement("h2", null, "승리"),
      ),
    );

    expect(view.host.querySelector('[data-doodle-variant="record"]')).not.toBeNull();
    expect(view.host.querySelector(".completion-stars")).toBeNull();
    act(() => view.root.unmount());
  });
});
