export const GLOW_SEQUENCE_MAX_ROUND = 60;
export const GLOW_SEQUENCE_MASTER_COUNT = 16;

export function getGlowSequenceLength(round) {
  const safeRound = Math.min(
    GLOW_SEQUENCE_MAX_ROUND,
    Math.max(1, Math.floor(Number(round) || 1)),
  );

  if (safeRound <= 2) return 3;
  if (safeRound <= 5) return 4;
  if (safeRound <= 9) return 5;
  if (safeRound === GLOW_SEQUENCE_MAX_ROUND) return GLOW_SEQUENCE_MASTER_COUNT;

  return Math.min(15, 6 + Math.floor((safeRound - 10) / 5));
}

export function getGlowGridSize(sequenceLength) {
  return 4;
}

export function getGlowPlaybackTiming() {
  return { leadMs: 520, onMs: 430, gapMs: 150 };
}

function normalizeRandom(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(0.999999999999, Math.max(0, number));
}

export function createGlowSequence(gridSize, length, randomFn = Math.random) {
  const safeGridSize = Math.max(1, Math.floor(Number(gridSize) || 1));
  const cellCount = safeGridSize * safeGridSize;
  const safeLength = Math.min(cellCount, Math.max(0, Math.floor(Number(length) || 0)));
  const cells = Array.from({ length: cellCount }, (_, index) => index);

  for (let index = cells.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(normalizeRandom(randomFn()) * (index + 1));
    [cells[index], cells[swapIndex]] = [cells[swapIndex], cells[index]];
  }

  return cells.slice(0, safeLength);
}

export function evaluateGlowChoice(sequence, step, cellIndex) {
  const safeStep = Math.max(0, Math.floor(Number(step) || 0));
  const correct = sequence?.[safeStep] === cellIndex;
  const nextStep = correct ? safeStep + 1 : safeStep;
  return {
    correct,
    nextStep,
    complete: correct && nextStep === sequence.length,
  };
}
