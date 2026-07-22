import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_DIRECTORY = fileURLToPath(new URL("../../", import.meta.url));
const GLOBAL_STYLES = readFileSync(join(SOURCE_DIRECTORY, "styles.css"), "utf8");

function findCssFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findCssFiles(path);
    return extname(entry.name) === ".css" ? [path] : [];
  });
}

describe("theme tokens", () => {
  it.each([
    ["white", "#ffffff"],
    ["ivory", "#fcfbf7"],
    ["teal", "#044f5f"],
    ["burgundy", "#8b1e24"],
    ["terracotta", "#bf5036"],
    ["sage", "#c1d7a0"],
    ["yellow", "#f2c14e"],
    ["soft-yellow", "#ffeaac"],
  ])("keeps the approved %s color", (token, value) => {
    expect(GLOBAL_STYLES).toContain(`--palette-${token}: ${value};`);
  });

  it.each([
    ["100", "#e4e2de"],
    ["300", "#c9c7c2"],
    ["500", "#a4a29c"],
    ["700", "#74726c"],
    ["900", "#3a3936"],
  ])("uses the approved neutral-%s base", (token, value) => {
    expect(GLOBAL_STYLES).toContain(`--palette-neutral-${token}: ${value};`);
  });

  it.each([
    ["red", "#f43545"],
    ["orange", "#ff8901"],
    ["yellow", "#fad717"],
    ["green", "#00ba71"],
    ["cyan", "#00c2de"],
    ["blue", "#00418d"],
    ["purple", "#5f2879"],
    ["pink", "#d91656"],
  ])("keeps the approved gameplay %s color", (token, value) => {
    expect(GLOBAL_STYLES).toContain(`--palette-game-${token}: ${value};`);
    expect(GLOBAL_STYLES).toContain(`--game-color-${token}: var(--palette-game-${token});`);
  });

  it.each([
    ["gold", "#ffb200"],
    ["orange", "#eb5b00"],
    ["plum", "#640d5f"],
  ])("reserves the retro %s color for gameplay effects", (token, value) => {
    expect(GLOBAL_STYLES).toContain(`--palette-effect-${token}: ${value};`);
  });

  it.each([
    ["bg", "#101318"],
    ["surface", "#1f242b"],
    ["elevated", "#1f242a"],
    ["accent", "#7da6e3"],
  ])("keeps the approved dark %s color independent of the neutral base", (token, value) => {
    expect(GLOBAL_STYLES).toContain(`--palette-dark-${token}: ${value};`);
  });

  it("maps the neutral scale to opposite light and dark roles", () => {
    expect(GLOBAL_STYLES).toContain("--palette-light-bg: var(--palette-white);");
    expect(GLOBAL_STYLES).toContain("--palette-light-surface: var(--palette-ivory);");
    expect(GLOBAL_STYLES).toContain("--palette-light-text: var(--palette-neutral-900);");
    expect(GLOBAL_STYLES).toContain("--palette-light-muted: var(--palette-neutral-700);");
    expect(GLOBAL_STYLES).toContain("--palette-light-line: var(--palette-neutral-300);");
    expect(GLOBAL_STYLES).toContain("--palette-dark-text: var(--palette-neutral-100);");
    expect(GLOBAL_STYLES).toContain("--palette-dark-muted: var(--palette-neutral-500);");
    expect(GLOBAL_STYLES).toContain("--palette-dark-line: var(--palette-neutral-900);");
    expect(GLOBAL_STYLES).toContain("--header-surface: var(--palette-light-bg);");
    expect(GLOBAL_STYLES).toContain("--header-surface: var(--palette-dark-bg);");
  });

  it("uses the darkest neutral for light chrome and the brightest neutral for dark chrome", () => {
    expect(GLOBAL_STYLES).toContain("--chrome-foreground: var(--palette-neutral-900);");
    expect(GLOBAL_STYLES).toContain("--chrome-foreground: var(--palette-dark-text);");
    expect(GLOBAL_STYLES).toContain("--primary-nav-text: var(--chrome-foreground);");
    expect(GLOBAL_STYLES).toContain("--primary-nav-active: var(--chrome-foreground);");
  });

  it("keeps the original blue accent roles available in dark mode", () => {
    expect(GLOBAL_STYLES).toContain("--accent: var(--palette-dark-accent);");
    expect(GLOBAL_STYLES).toContain("--accent-2: var(--palette-dark-accent);");
    expect(GLOBAL_STYLES).toContain("--sudoku-grid-line-strong: color-mix(in oklab, var(--text) 54%, var(--line));");
  });

  it("uses the selected dark featured surface and the shared home-card modal surface", () => {
    expect(GLOBAL_STYLES).toContain("--featured-surface: var(--palette-dark-elevated);");
    expect(GLOBAL_STYLES).toContain("--featured-action-bg: var(--featured-surface);");
    expect(GLOBAL_STYLES.match(/--game-modal-bg: var\(--home-card-surface\);/g)).toHaveLength(2);
    expect(GLOBAL_STYLES).not.toContain("--palette-modal-navy");
  });

  it("uses the approved light featured surface and neutral home controls", () => {
    expect(GLOBAL_STYLES).toContain("--featured-surface: var(--palette-soft-yellow);");
    expect(GLOBAL_STYLES).toContain("--featured-text: var(--palette-light-text);");
    expect(GLOBAL_STYLES).toContain("--featured-action-bg: var(--featured-surface);");
    expect(GLOBAL_STYLES).toContain("--featured-action-text: var(--palette-light-text);");
    expect(GLOBAL_STYLES).toContain("--home-card-surface: var(--palette-light-surface);");
    expect(GLOBAL_STYLES).toContain("--home-button-surface: var(--home-card-surface);");
    expect(GLOBAL_STYLES).toContain("--home-button-border: var(--palette-light-line);");
  });

  it("keeps the dark featured action neutral instead of filling it with the accent", () => {
    expect(GLOBAL_STYLES).toContain("--featured-action-text: var(--palette-dark-text);");
    expect(GLOBAL_STYLES).not.toContain("--featured-action-bg: var(--palette-dark-accent);");
  });

  it("keeps shared buttons on their surrounding neutral surface", () => {
    expect(GLOBAL_STYLES.match(/--button-surface: var\(--home-button-surface\);/g)).toHaveLength(2);
    expect(GLOBAL_STYLES).toContain("background: var(--button-surface);");
    expect(GLOBAL_STYLES).toContain("border: 1px solid var(--button-border);");
    expect(GLOBAL_STYLES).toContain("box-shadow: var(--button-shadow);");
    expect(GLOBAL_STYLES).not.toContain("--warm-game-action-text");
  });

  it("does not keep the replaced provisional accent tokens", () => {
    expect(GLOBAL_STYLES).not.toMatch(/--palette-(?:light-(?:accent|sky|coral|orange|yellow)|dark-(?:coral|yellow)):/);
    expect(GLOBAL_STYLES).not.toMatch(/--accent-(?:sky|coral|orange):/);
  });

  it("does not keep the replaced charcoal primitive", () => {
    expect(GLOBAL_STYLES).not.toContain("--palette-charcoal:");
  });

  it("does not assign black text directly in any stylesheet", () => {
    const blackTextPattern = /\bcolor\s*:\s*(?:black|#000(?:000)?)\b/i;

    findCssFiles(SOURCE_DIRECTORY).forEach((path) => {
      expect(readFileSync(path, "utf8"), path).not.toMatch(blackTextPattern);
    });
  });
});
