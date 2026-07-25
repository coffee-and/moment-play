import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(new URL("./GameStageDoodle.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("./game-stage-doodle.css", import.meta.url), "utf8");
const face = readFileSync(new URL("../assets/doodles/start-face.svg", import.meta.url), "utf8");
const hands = readFileSync(new URL("../assets/doodles/start-hands.svg", import.meta.url), "utf8");

describe("GameStageDoodle start artwork", () => {
  it("composes the separately selected Figma hands and face assets", () => {
    expect(component).toContain('import startFace from "../assets/doodles/start-face.svg"');
    expect(component).toContain('import startHands from "../assets/doodles/start-hands.svg"');
    expect(component).toContain('part="start-hands"');
    expect(component).toContain('part="start-face"');
    expect(component).not.toContain("countdown-cheer.svg");
  });

  it("keeps the marked expression and raised hands in their own SVG sources", () => {
    expect(face).toContain("38.003582");
    expect(face).toContain("M6.37736 73.9029");
    expect(hands).toContain("M249.205 7.3518");
    expect(hands).toContain("M33.2851 33.7859");
  });

  it("widens only the hand layer and centers the selected face", () => {
    expect(css).toContain('[data-doodle-part="start-hands"]');
    expect(css).toContain("scaleX(1.08)");
    expect(css).toContain('[data-doodle-part="start-face"]');
    expect(css).toContain("translateX(-50%)");
  });
});
