import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readStyle(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("motion accessibility styles", () => {
  it("keeps action feedback non-blocking, badge-free, and provides a reduced-motion fallback", () => {
    const css = readStyle("./styles/game-action-feedback.css");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("game-action-feedback-fade");
    expect(css).not.toContain("backdrop-filter");
    expect(css).not.toContain("border-radius: 999px");
    expect(css).toContain("background: transparent");
    expect(css).toContain("game-action-star-sparkle");
  });

  it("caps completion decoration motion with a reduced-motion fade", () => {
    const css = readStyle("./styles/completion-stars.css");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("completion-star-fade");
    expect(css).not.toContain("infinite");
  });
});
