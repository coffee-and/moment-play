import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  new URL("./styles/game-stage-global-shell.css", import.meta.url),
  "utf8",
);

describe("global GameStage shell", () => {
  it("targets the shared GameStage contract instead of a game-name allowlist", () => {
    expect(css).toContain("section.game-stage .game-stage__inner");
    expect(css).toContain("section.game-stage .game-stage__side");
    expect(css).toContain("section.game-stage .game-stage__play");
    expect(css).toContain("section.game-stage .game-stage__sidebar .stat-row");
    expect(css).not.toContain(":is(.flappy-game");
  });

  it("keeps the board first and collapses duplicated shared metadata", () => {
    expect(css).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(css).toContain("--stage-card-min-height: 0px");
    expect(css).toContain("section.game-stage .game-2048__meta");
    expect(css).toContain("section.game-stage .sudoku-game__meta");
  });

  it("keeps the compact HUD usable on mobile", () => {
    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("flex: 1 0 96px");
    expect(css).toContain("scrollbar-width: none");
  });
});
