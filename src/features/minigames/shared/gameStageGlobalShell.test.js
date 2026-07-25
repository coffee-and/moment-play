import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  new URL("./styles/game-stage-global-shell.css", import.meta.url),
  "utf8",
);

const finalPolishCss = readFileSync(
  new URL("./styles/ui-final-polish.css", import.meta.url),
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

  it("fits every shared HUD value into one mobile card without horizontal scrolling", () => {
    expect(css).toContain("grid-template-columns: none");
    expect(css).toContain("grid-auto-flow: column");
    expect(css).toContain("grid-auto-columns: minmax(0, 1fr)");
    expect(css).toContain("section.game-stage .game-stage__sidebar .stat + .stat::before");
    expect(css).not.toContain("overflow-x: auto");
    expect(css).not.toContain("flex: 1 0 96px");
  });

  it("keeps HUD layout ownership out of the final polish layer", () => {
    expect(finalPolishCss).not.toContain("game-stage__sidebar .stat-row");
    expect(finalPolishCss).not.toContain("game-stage__sidebar .stat {");
  });
});
