import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SOURCE_ROOT = path.resolve("src");
const FOUNDATION_FILE = path.resolve("src/shared/styles/foundation.css");
const FEATURE_ROOT = `${path.resolve("src/features")}${path.sep}`;
const SHARED_FEATURE_CONTRACTS = new Set([
  path.resolve("src/features/minigames/shared/components/game-stage-doodle.css"),
  path.resolve("src/features/minigames/shared/styles/completion-stars.css"),
  path.resolve("src/features/minigames/shared/styles/game-item-panel.css"),
  path.resolve("src/features/minigames/shared/styles/logic-puzzle-stage.css"),
]);
const RUNTIME_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  }))).flat();
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function lineAt(source, index) {
  const start = source.lastIndexOf("\n", index - 1) + 1;
  const end = source.indexOf("\n", index);
  return source.slice(start, end === -1 ? source.length : end);
}

function relative(filePath) {
  return path.relative(process.cwd(), filePath);
}

const files = await collectFiles(SOURCE_ROOT);
const cssFiles = files.filter((filePath) => filePath.endsWith(".css"));
const runtimeFiles = files.filter((filePath) => RUNTIME_EXTENSIONS.has(path.extname(filePath)));
const violations = [];
const repeatedPrimitiveDeclarations = new Map();

for (const filePath of cssFiles) {
  if (filePath.startsWith(FEATURE_ROOT) && !filePath.endsWith(".module.css") && !SHARED_FEATURE_CONTRACTS.has(filePath)) {
    violations.push({ filePath, line: 1, reason: "feature styles must use CSS Modules" });
  }

  const source = await readFile(filePath, "utf8");
  if (filePath !== FOUNDATION_FILE) {
    for (const match of source.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      if (filePath.endsWith(".module.css") && /^\s*--[\w-]+\s*:/.test(lineAt(source, match.index))) continue;
      violations.push({ filePath, line: lineNumber(source, match.index), reason: "raw colors belong in foundation.css" });
    }
  }
  for (const match of source.matchAll(/border-radius:\s*(?:99|999)px\b/g)) {
    violations.push({ filePath, line: lineNumber(source, match.index), reason: "use the shared --r-pill token" });
  }
  for (const match of source.matchAll(/z-index:\s*(-?\d+)\b/g)) {
    violations.push({ filePath, line: lineNumber(source, match.index), reason: "z-index values must use the shared layer scale" });
  }

  if (filePath !== FOUNDATION_FILE) {
    for (const match of source.matchAll(/(?:^|[;{\n])\s*(border-radius|box-shadow)\s*:\s*([^;]+);/gm)) {
      const property = match[1];
      const value = match[2].replace(/\s+/g, " ").trim();
      const isTokenized = value.startsWith("var(") || ["0", "50%", "inherit", "none"].includes(value);
      const isResponsiveRadius = property === "border-radius" && /^(?:calc|clamp)\(/.test(value);
      if (isTokenized || isResponsiveRadius) continue;

      const key = `${property}:${value}`;
      const entries = repeatedPrimitiveDeclarations.get(key) ?? [];
      entries.push({ filePath, line: lineNumber(source, match.index), property, value });
      repeatedPrimitiveDeclarations.set(key, entries);
    }
  }
}

for (const entries of repeatedPrimitiveDeclarations.values()) {
  if (entries.length < 2) continue;
  for (const entry of entries) {
    violations.push({
      filePath: entry.filePath,
      line: entry.line,
      reason: `repeated raw ${entry.property} value "${entry.value}" must use a semantic token`,
    });
  }
}

for (const filePath of runtimeFiles) {
  const source = await readFile(filePath, "utf8");
  for (const match of source.matchAll(/import\s+["'][^"']+\.module\.css["']/g)) {
    violations.push({ filePath, line: lineNumber(source, match.index), reason: "CSS Modules must be imported as a class map" });
  }
}

if (violations.length > 0) {
  console.error("Style architecture violations:");
  for (const violation of violations) {
    console.error(`- ${relative(violation.filePath)}:${violation.line} ${violation.reason}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Style architecture check passed (${cssFiles.length} CSS files).`);
}
