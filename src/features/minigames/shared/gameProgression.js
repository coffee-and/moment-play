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

export const ENDLESS_DIFFICULTIES = ["easy", "normal", "hard"];
export const ENDLESS_BLOCK_SIZE = 10;

export const ENDLESS_DIFFICULTY_LABELS = {
  easy: "EASY",
  normal: "NORMAL",
  hard: "HARD",
};

export function normalizeEndlessDifficulty(difficulty) {
  return ENDLESS_DIFFICULTIES.includes(difficulty) ? difficulty : ENDLESS_DIFFICULTIES[0];
}

export function getEndlessRoundProgress(round, blockSize = ENDLESS_BLOCK_SIZE) {
  const safeBlockSize = Math.max(1, Math.floor(Number(blockSize) || ENDLESS_BLOCK_SIZE));
  const safeRound = Math.max(1, Math.floor(Number(round) || 1));
  return {
    block: Math.floor((safeRound - 1) / safeBlockSize) + 1,
    blockRound: ((safeRound - 1) % safeBlockSize) + 1,
    isBlockEnd: safeRound % safeBlockSize === 0,
    round: safeRound,
  };
}

export function getNextEndlessDifficulty(difficulty) {
  const current = normalizeEndlessDifficulty(difficulty);
  const index = ENDLESS_DIFFICULTIES.indexOf(current);
  return ENDLESS_DIFFICULTIES[Math.min(index + 1, ENDLESS_DIFFICULTIES.length - 1)];
}

export function canAdvanceEndlessDifficulty(difficulty) {
  return normalizeEndlessDifficulty(difficulty) !== ENDLESS_DIFFICULTIES.at(-1);
}

export function formatEndlessMilestone(difficulty, round) {
  const normalizedDifficulty = normalizeEndlessDifficulty(difficulty);
  const progress = getEndlessRoundProgress(round);
  return `${ENDLESS_DIFFICULTY_LABELS[normalizedDifficulty]} · ${progress.round} ROUND`;
}
