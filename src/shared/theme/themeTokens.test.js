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
    ["ivory", "#fcfbf7"],
    ["charcoal", "#343840"],
    ["teal", "#044f5f"],
    ["green", "#2f6f3e"],
    ["burgundy", "#8b1e24"],
    ["terracotta", "#bf5036"],
    ["sage", "#c1d7a0"],
    ["yellow", "#f2c14e"],
    ["slate-blue", "#9dabb6"],
    ["dusty-rose", "#9d545d"],
  ])("keeps the approved %s color", (token, value) => {
    expect(GLOBAL_STYLES).toContain(`--palette-${token}: ${value};`);
  });

  it.each([
    ["bg", "#101318"],
    ["surface", "#151d28"],
    ["elevated", "#1b2636"],
    ["line", "#313b49"],
    ["text", "#f3f6fa"],
    ["muted", "#a3adbb"],
    ["accent", "#7da6e3"],
  ])("keeps the approved dark %s color", (token, value) => {
    expect(GLOBAL_STYLES).toContain(`--palette-dark-${token}: ${value};`);
  });

  it("uses one shared chrome foreground in light and the brightest text token in dark", () => {
    expect(GLOBAL_STYLES).toContain("--chrome-foreground: var(--palette-charcoal);");
    expect(GLOBAL_STYLES).toContain("--chrome-foreground: var(--palette-dark-text);");
    expect(GLOBAL_STYLES).toContain("--primary-nav-text: var(--chrome-foreground);");
    expect(GLOBAL_STYLES).toContain("--primary-nav-active: var(--chrome-foreground);");
  });

  it("restores the original blue accent roles in dark mode", () => {
    expect(GLOBAL_STYLES).toContain("--accent: var(--palette-dark-accent);");
    expect(GLOBAL_STYLES).toContain("--accent-2: var(--palette-dark-accent);");
    expect(GLOBAL_STYLES).toContain("--sudoku-grid-line-strong: var(--palette-dark-accent);");
  });

  it("does not keep the replaced provisional accent tokens", () => {
    expect(GLOBAL_STYLES).not.toMatch(/--palette-(?:light-(?:accent|sky|coral|orange|yellow)|dark-(?:coral|yellow)):/);
    expect(GLOBAL_STYLES).not.toMatch(/--accent-(?:sky|coral|orange):/);
  });

  it("does not assign black text directly in any stylesheet", () => {
    const blackTextPattern = /\bcolor\s*:\s*(?:black|#000(?:000)?)\b/i;

    findCssFiles(SOURCE_DIRECTORY).forEach((path) => {
      expect(readFileSync(path, "utf8"), path).not.toMatch(blackTextPattern);
    });
  });
});
