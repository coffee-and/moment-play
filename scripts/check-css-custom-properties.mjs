import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SOURCE_ROOT = path.resolve("src");
const CSS_EXTENSION = ".css";
const RUNTIME_SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const CUSTOM_PROPERTY_NAME = "--[-_a-zA-Z0-9]+";
const CSS_DEFINITION_PATTERN = new RegExp(`(${CUSTOM_PROPERTY_NAME})\\s*:`, "g");
const CSS_USAGE_PATTERN = new RegExp(`var\\(\\s*(${CUSTOM_PROPERTY_NAME})(\\s*,)?`, "g");
const RUNTIME_OBJECT_PROPERTY_PATTERN = new RegExp(`["'](${CUSTOM_PROPERTY_NAME})["']\\s*:`, "g");
const RUNTIME_SET_PROPERTY_PATTERN = new RegExp(`\\.setProperty\\(\\s*["'](${CUSTOM_PROPERTY_NAME})["']`, "g");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  }));
  return nestedFiles.flat();
}

function collectMatches(source, pattern, target) {
  pattern.lastIndex = 0;
  for (const match of source.matchAll(pattern)) target.add(match[1]);
}

function getLineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ""));
}

const sourceFiles = await collectFiles(SOURCE_ROOT);
const cssFiles = sourceFiles.filter((filePath) => path.extname(filePath) === CSS_EXTENSION);
const runtimeFiles = sourceFiles.filter((filePath) => RUNTIME_SOURCE_EXTENSIONS.has(path.extname(filePath)));
const definedProperties = new Set();

const cssSources = await Promise.all(cssFiles.map(async (filePath) => ({
  filePath,
  source: stripCssComments(await readFile(filePath, "utf8")),
})));
const runtimeSources = await Promise.all(runtimeFiles.map(async (filePath) => ({
  filePath,
  source: await readFile(filePath, "utf8"),
})));
for (const { source } of cssSources) {
  collectMatches(source, CSS_DEFINITION_PATTERN, definedProperties);
}

for (const { source } of runtimeSources) {
  collectMatches(source, RUNTIME_OBJECT_PROPERTY_PATTERN, definedProperties);
  collectMatches(source, RUNTIME_SET_PROPERTY_PATTERN, definedProperties);
}

const undefinedUsages = [];
for (const { filePath, source } of [...cssSources, ...runtimeSources]) {
  CSS_USAGE_PATTERN.lastIndex = 0;
  for (const match of source.matchAll(CSS_USAGE_PATTERN)) {
    const [, propertyName, fallbackSeparator] = match;
    if (fallbackSeparator || definedProperties.has(propertyName)) continue;
    undefinedUsages.push({
      filePath: path.relative(process.cwd(), filePath),
      line: getLineNumber(source, match.index),
      propertyName,
    });
  }
}

if (undefinedUsages.length > 0) {
  console.error("Undefined CSS custom properties without a fallback:");
  for (const usage of undefinedUsages) {
    console.error(`- ${usage.filePath}:${usage.line} ${usage.propertyName}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `CSS custom property check passed (${definedProperties.size} definitions, ${cssFiles.length} CSS files, ${runtimeFiles.length} runtime files).`,
  );
}
