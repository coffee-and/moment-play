// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CompletionStars, getCompletionStarCount } from "./components/CompletionStars.jsx";
import { getStreakCelebrationCopy, NEXT_ROUND_LABEL, useGameStreak } from "./gameStreak.js";

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

  it("maps every requested completion-copy threshold", () => {
    expect(NEXT_ROUND_LABEL).toBe("다음판!");
    expect(getStreakCelebrationCopy(1)).toEqual({ title: "완성!", subtitle: "잘했어요" });
    expect(getStreakCelebrationCopy(2)).toEqual({ title: "2판 연속 성공!", subtitle: "잘하고 있어요" });
    expect(getStreakCelebrationCopy(4)).toEqual({ title: "4판 연속 성공!", subtitle: "정말 잘했어요" });
    expect(getStreakCelebrationCopy(7)).toEqual({ title: "대단해요!", subtitle: "7판 연속 성공" });
    expect(getStreakCelebrationCopy(10)).toEqual({ title: "놀라워요!", subtitle: "10판 연속으로 풀었어요" });
  });
});

describe("completion stars", () => {
  it("caps decorative particles and keeps them outside the accessibility tree", () => {
    expect(getCompletionStarCount(1)).toBe(7);
    expect(getCompletionStarCount(2)).toBe(9);
    expect(getCompletionStarCount(4)).toBe(11);
    expect(getCompletionStarCount(7)).toBe(14);
    expect(getCompletionStarCount(99)).toBe(16);

    const view = render(<CompletionStars streak={99} />);
    const decoration = view.host.querySelector(".completion-stars");
    expect(decoration.getAttribute("aria-hidden")).toBe("true");
    expect(decoration.querySelectorAll("i")).toHaveLength(16);
    view.unmount();
  });
});
