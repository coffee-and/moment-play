// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { GameStageDoodle } from "./GameStageDoodle.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderDoodle(variant) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(React.createElement(GameStageDoodle, { variant })));
  return { host, root };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("GameStageDoodle", () => {
  it("composes the start artwork from separate hands and face layers", () => {
    const view = renderDoodle("start");
    expect(view.host.querySelector('[data-doodle-part="start-hands"]')).not.toBeNull();
    expect(view.host.querySelector('[data-doodle-part="start-face"]')).not.toBeNull();
    expect(view.host.querySelectorAll(".game-stage-doodle__art")).toHaveLength(2);
    act(() => view.root.unmount());
  });

  it("composes the celebration from face and heart layers", () => {
    const view = renderDoodle("record");
    expect(view.host.querySelector('[data-doodle-part="record-face"]')).not.toBeNull();
    expect(view.host.querySelectorAll('[data-doodle-part^="record-heart"]')).toHaveLength(2);
    act(() => view.root.unmount());
  });
});
