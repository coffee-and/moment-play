import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./timing-tap.css", import.meta.url), "utf8");
const component = readFileSync(new URL("./TimingTapGame.jsx", import.meta.url), "utf8");

describe("Timing Tap mobile layout", () => {
  it("keeps the mobile board separated from the shared HUD", () => {
    expect(css).toContain("section.game-stage.timing-tap .game-stage__inner");
    expect(css).toContain("gap: 16px");
    expect(css).toContain("section.game-stage.timing-tap .game-stage__play");
    expect(css).toContain("padding-top: 18px");
  });

  it("gives the round copy and track breathing room on narrow screens", () => {
    expect(css).toContain(".timing-tap__game");
    expect(css).toContain("justify-content: flex-start");
    expect(css).toContain("min-height: 340px");
    expect(css).toContain("gap: 24px");
    expect(css).toContain("padding-top: 30px");
  });

  it("uses the shared start and victory celebration components", () => {
    expect(component).toContain('<GameStageDoodle variant="start" />');
    expect(component).toContain("<GameCelebration compact />");
    expect(component).not.toContain("GameRecordCelebration");
    expect(component).toContain("<GameStageModal");
  });
});
