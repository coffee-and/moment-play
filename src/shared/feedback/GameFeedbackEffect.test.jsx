// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { GameFeedbackEffect } from "./GameFeedbackEffect.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderEffect(feedback) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<GameFeedbackEffect feedback={feedback} />));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("GameFeedbackEffect", () => {
  it("uses the compact star burst for a correct action without the old fullscreen particles", () => {
    const view = renderEffect({ id: 1, kind: "positive" });
    expect(view.host.querySelector(".game-feedback-effect__burst")).not.toBeNull();
    expect(view.host.querySelector(".game-feedback-effect__label")?.textContent).toBe("NICE");
    expect(view.host.querySelector(".game-feedback-effect__particles")).toBeNull();
    expect(view.host.querySelector(".game-feedback-effect__flash")).toBeNull();
    view.unmount();
  });

  it("renders a four-point orbit structure for completion feedback", () => {
    const clear = renderEffect({ id: 2, kind: "clear" });
    expect(clear.host.querySelector(".game-feedback-effect")?.classList.contains("is-clear")).toBe(true);
    expect(clear.host.querySelectorAll(".game-feedback-effect__orbit i")).toHaveLength(4);
    expect(clear.host.querySelector(".game-feedback-effect__label")?.textContent).toBe("CLEAR!");
    clear.unmount();
  });
});
