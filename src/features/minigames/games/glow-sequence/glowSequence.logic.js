import {
  GLOW_SEQUENCE_GRID_SIZE,
  GLOW_SEQUENCE_MASTER_END_ROUND,
  GLOW_SEQUENCE_MASTER_LENGTH,
  GLOW_SEQUENCE_MILESTONE_INTERVAL,
  GLOW_SEQUENCE_ROUND_OUTCOME,
  GLOW_SEQUENCE_STANDARD_END_ROUND,
  GLOW_SEQUENCE_TIMING,
} from "./glowSequence.config.js";

function normalizeRound(round) {
  return Math.min(
    GLOW_SEQUENCE_MASTER_END_ROUND,
    Math.max(1, Math.floor(Number(round) || 1)),
  );
}

export function getGlowRoundOutcome(round) {
  const safeRound = normalizeRound(round);
  if (safeRound === GLOW_SEQUENCE_MASTER_END_ROUND) {
    return GLOW_SEQUENCE_ROUND_OUTCOME.MASTER_COMPLETE;
  }
  if (safeRound === GLOW_SEQUENCE_STANDARD_END_ROUND) {
    return GLOW_SEQUENCE_ROUND_OUTCOME.STANDARD_COMPLETE;
  }
  return GLOW_SEQUENCE_ROUND_OUTCOME.CONTINUE;
}

export function getGlowRoundLimit(round) {
  return normalizeRound(round) > GLOW_SEQUENCE_STANDARD_END_ROUND
    ? GLOW_SEQUENCE_MASTER_END_ROUND
    : GLOW_SEQUENCE_STANDARD_END_ROUND;
}

export function isGlowMilestoneRound(round) {
  return normalizeRound(round) % GLOW_SEQUENCE_MILESTONE_INTERVAL === 0;
}

export function getGlowSequenceLength(round) {
  const safeRound = normalizeRound(round);

  if (safeRound <= 2) return 3;
  if (safeRound <= 5) return 4;
  if (safeRound <= 9) return 5;
  if (safeRound === GLOW_SEQUENCE_MASTER_END_ROUND) return GLOW_SEQUENCE_MASTER_LENGTH;

  return Math.min(15, 6 + Math.floor((safeRound - 10) / 5));
}

export function getGlowGridSize() {
  return GLOW_SEQUENCE_GRID_SIZE;
}

export function getGlowPlaybackTiming() {
  return {
    gapMs: GLOW_SEQUENCE_TIMING.PLAYBACK_GAP_MS,
    leadMs: GLOW_SEQUENCE_TIMING.PLAYBACK_LEAD_MS,
    onMs: GLOW_SEQUENCE_TIMING.PLAYBACK_ON_MS,
  };
}

export function getGlowPlaybackDuration(sequenceLength) {
  const safeLength = Math.max(0, Math.floor(Number(sequenceLength) || 0));
  const timing = getGlowPlaybackTiming();
  return timing.leadMs + safeLength * (timing.onMs + timing.gapMs);
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
