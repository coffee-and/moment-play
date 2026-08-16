// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CompletionStars } from "./components/CompletionStars.jsx";
import { useGameStreak } from "./gameStreak.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function StreakHarness() {
  const streak = useGameStreak();
  return (
    <div>
      <output data-testid="streak">{streak.streak}</output>
      <output data-testid="completion">{streak.completionStreak}</output>
      <output data-testid="eligible">{String(streak.streakEligible)}</output>
      <button type="button" onClick={() => streak.beginRound({ preserveStreak: true })}>next</button>
      <button type="button" onClick={() => streak.beginRound()}>manual</button>
      <button type="button" onClick={() => streak.disqualifyRound({ answerRevealed: true })}>reveal</button>
      <button type="button" onClick={streak.recordSuccess}>complete</button>
    </div>
  );
}

function render(element) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return {
    host,
    unmount: () => act(() => root.unmount()),
  };
}

function click(view, label) {
  act(() => [...view.host.querySelectorAll("button")]
    .find((button) => button.textContent === label).click());
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("game streak session state", () => {
  it("keeps streak through hinted direct solves and next rounds, but not manual resets", () => {
    const view = render(<StreakHarness />);
    click(view, "complete");
    expect(view.host.querySelector('[data-testid="completion"]').textContent).toBe("1");

    // A normal hint intentionally has no disqualifying transition.
    click(view, "next");
    click(view, "complete");
    expect(view.host.querySelector('[data-testid="completion"]').textContent).toBe("2");

    click(view, "manual");
    expect(view.host.querySelector('[data-testid="streak"]').textContent).toBe("0");
    click(view, "complete");
    expect(view.host.querySelector('[data-testid="completion"]').textContent).toBe("1");
    view.unmount();
  });

  it("resets on answer reveal and ignores duplicate completion calls", () => {
    const view = render(<StreakHarness />);
    act(() => {
      const complete = [...view.host.querySelectorAll("button")]
        .find((button) => button.textContent === "complete");
      complete.click();
      complete.click();
    });
    expect(view.host.querySelector('[data-testid="completion"]').textContent).toBe("1");

    click(view, "next");
    click(view, "reveal");
    expect(view.host.querySelector('[data-testid="eligible"]').textContent).toBe("false");
    click(view, "complete");
    expect(view.host.querySelector('[data-testid="completion"]').textContent).toBe("0");
    expect(view.host.querySelector('[data-testid="streak"]').textContent).toBe("0");
    view.unmount();
  });
});

describe("completion stars", () => {
  it("keeps decorative particles outside the accessibility tree", () => {
    const view = render(<CompletionStars streak={99} />);
    const decoration = view.host.querySelector(".completion-stars");
    expect(decoration.getAttribute("aria-hidden")).toBe("true");
    view.unmount();
  });
});
