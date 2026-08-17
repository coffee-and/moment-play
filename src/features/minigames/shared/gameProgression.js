export function clampNumber(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return min;
  return Math.min(max, Math.max(min, numericValue));
}

export function getComboAward(basePoints, combo, options = {}) {
  const safeBase = Math.max(0, Math.round(Number(basePoints) || 0));
  const safeCombo = Math.max(1, Math.floor(Number(combo) || 1));
  const step = Math.max(0, Number(options.step) || 1);
  const maxMultiplier = Math.max(1, Number(options.maxMultiplier) || 3);
  const multiplier = Math.min(maxMultiplier, 1 + (safeCombo - 1) * step);

  return {
    points: Math.round(safeBase * multiplier),
    multiplier,
  };
}

export function getStarRating(progressRatio, options = {}) {
  const ratio = clampNumber(progressRatio, 0, 1);
  const mistakes = Math.max(0, Math.floor(Number(options.mistakes) || 0));
  const threeStarThreshold = clampNumber(options.threeStarThreshold ?? 0.82, 0, 1);
  const twoStarThreshold = clampNumber(options.twoStarThreshold ?? 0.5, 0, threeStarThreshold);
  const maxMistakesForThree = Math.max(0, Math.floor(Number(options.maxMistakesForThree) || 0));

  if (ratio >= threeStarThreshold && mistakes <= maxMistakesForThree) return 3;
  if (ratio >= twoStarThreshold) return 2;
  return 1;
}

export function formatStarRating(rating) {
  const safeRating = Math.round(clampNumber(rating, 1, 3));
  return `${"★".repeat(safeRating)}${"☆".repeat(3 - safeRating)}`;
}
