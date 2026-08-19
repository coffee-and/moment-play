import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SOURCE_ROOT = path.resolve("src");
const FOUNDATION_FILE = path.resolve("src/shared/styles/foundation.css");
const FEATURE_ROOT = `${path.resolve("src/features")}${path.sep}`;
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

function relative(filePath) {
  return path.relative(process.cwd(), filePath);
}

const files = await collectFiles(SOURCE_ROOT);
const cssFiles = files.filter((filePath) => filePath.endsWith(".css"));
const runtimeFiles = files.filter((filePath) => RUNTIME_EXTENSIONS.has(path.extname(filePath)));
const violations = [];

for (const filePath of cssFiles) {
  const normalized = filePath.split(path.sep).join("/");
  const isSharedFeatureContract = normalized.includes("/features/") && normalized.includes("/shared/");
  if (filePath.startsWith(FEATURE_ROOT) && !filePath.endsWith(".module.css") && !isSharedFeatureContract) {
    violations.push({ filePath, line: 1, reason: "feature styles must use CSS Modules" });
  }

  const source = await readFile(filePath, "utf8");
  if (filePath !== FOUNDATION_FILE) {
    for (const match of source.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      violations.push({ filePath, line: lineNumber(source, match.index), reason: "raw colors belong in foundation.css" });
    }
  }
  for (const match of source.matchAll(/border-radius:\s*(?:99|999)px\b/g)) {
    violations.push({ filePath, line: lineNumber(source, match.index), reason: "use the shared --r-pill token" });
  }
  for (const match of source.matchAll(/z-index:\s*(-?\d+)\b/g)) {
    if (Number(match[1]) > 4) {
      violations.push({ filePath, line: lineNumber(source, match.index), reason: "large z-index values must use the shared layer scale" });
    }
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
