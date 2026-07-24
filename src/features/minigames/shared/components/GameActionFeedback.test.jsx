/** @vitest-environment jsdom */
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { GameActionFeedback } from "./GameActionFeedback.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderFeedback(props) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  act(() => {
    root.render(<GameActionFeedback {...props} />);
  });

  return {
    host,
    unmount() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("GameActionFeedback", () => {
  it("renders a compact one-line message with local sparkle decoration", () => {
    const view = renderFeedback({
      feedback: { id: 1, label: "NICE!" },
    });

    expect(view.host.querySelector(".game-action-feedback__message")?.textContent).toBe("NICE!");
    expect(view.host.querySelectorAll(".game-action-feedback__stars i")).toHaveLength(5);
    expect(view.host.querySelector(".game-action-feedback")?.classList.contains("has-message")).toBe(true);
    view.unmount();
  });

  it("scales sparkle count for a combo without creating a separate badge wrapper", () => {
    const view = renderFeedback({
      feedback: {
        comboLabel: "×5",
        id: 2,
        label: "CLEAR",
        variant: "major",
      },
    });

    const message = view.host.querySelector(".game-action-feedback__message");
    expect(message?.textContent).toBe("CLEAR×5");
    expect(message?.children).toHaveLength(2);
    expect(view.host.querySelectorAll(".game-action-feedback__stars i")).toHaveLength(9);
    view.unmount();
  });

  it("keeps negative feedback quiet and non-announcing when requested", () => {
    const view = renderFeedback({
      announce: false,
      feedback: { id: 3, label: "−1", tone: "negative" },
    });

    const feedback = view.host.querySelector(".game-action-feedback");
    expect(feedback?.getAttribute("aria-hidden")).toBe("true");
    expect(feedback?.getAttribute("role")).toBeNull();
    expect(view.host.querySelectorAll(".game-action-feedback__stars i")).toHaveLength(0);
    view.unmount();
  });
});
