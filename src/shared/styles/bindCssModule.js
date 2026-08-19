export function bindCssModule(styles) {
  return (...values) => values
    .flatMap((value) => String(value ?? "").split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(" ");
}
