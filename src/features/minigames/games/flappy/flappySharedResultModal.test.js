import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./flappy-shared-result-modal.css", import.meta.url), "utf8");

describe("Star Flight shared result modal", () => {
  it("uses shared modal theme tokens instead of the game-local navy curtain palette", () => {
    expect(css).toContain("var(--game-modal-bg)");
    expect(css).toContain("var(--game-modal-text)");
    expect(css).toContain("var(--game-modal-muted)");
    expect(css).toContain("var(--game-modal-border)");
    expect(css).not.toContain("var(--flappy-curtain-start)");
    expect(css).not.toContain("var(--flappy-curtain-center)");
  });

  it("keeps the result surface fixed while the page underneath scrolls", () => {
    expect(css).toContain("position: fixed");
    expect(css).toContain("min-height: 100dvh");
    expect(css).toContain("overscroll-behavior: contain");
  });
});
