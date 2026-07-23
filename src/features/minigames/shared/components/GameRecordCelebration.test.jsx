// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { GameRecordCelebration } from "./GameRecordCelebration.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderCelebration(props) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<GameRecordCelebration {...props} />));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("GameRecordCelebration", () => {
  it("renders the shared crown artwork only for a new record", () => {
    const hidden = renderCelebration({ isNewRecord: false });
    expect(hidden.host.querySelector('[data-doodle-variant="record"]')).toBeNull();
    hidden.unmount();

    const visible = renderCelebration({ compact: true, isNewRecord: true });
    const artwork = visible.host.querySelector('[data-doodle-variant="record"]');
    expect(artwork).not.toBeNull();
    expect(artwork.classList.contains("game-stage-doodle--compact")).toBe(true);
    visible.unmount();
  });
});
