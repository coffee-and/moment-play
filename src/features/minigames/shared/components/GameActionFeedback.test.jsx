/** @vitest-environment jsdom */
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
  it("keeps negative feedback quiet and non-announcing when requested", () => {
    const view = renderFeedback({
      announce: false,
      feedback: { id: 3, label: "−1", tone: "negative" },
    });

    const feedback = view.host.querySelector('[data-feedback-tone="negative"]');
    expect(feedback?.getAttribute("aria-hidden")).toBe("true");
    expect(feedback?.getAttribute("role")).toBeNull();
    expect(view.host.querySelectorAll('[data-feedback-element="stars"] i')).toHaveLength(0);
    view.unmount();
  });
});
