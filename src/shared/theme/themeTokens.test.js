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

describe("dark theme tokens", () => {
  it.each([
    ["bg", "#101318"],
    ["surface", "#151d28"],
    ["elevated", "#1b2636"],
    ["line", "#313b49"],
    ["text", "#f3f6fa"],
    ["muted", "#a3adbb"],
    ["accent", "#7da6e3"],
    ["coral", "#f08aa0"],
    ["yellow", "#e9c96c"],
  ])("keeps the approved %s color", (token, value) => {
    expect(GLOBAL_STYLES).toContain(`--palette-dark-${token}: ${value};`);
  });

  it("does not assign black text directly in any stylesheet", () => {
    const blackTextPattern = /\bcolor\s*:\s*(?:black|#000(?:000)?)\b/i;

    findCssFiles(SOURCE_DIRECTORY).forEach((path) => {
      expect(readFileSync(path, "utf8"), path).not.toMatch(blackTextPattern);
    });
  });
});
