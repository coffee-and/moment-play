import { getComboAward } from "../../shared/gameProgression.js";

export const MEMORY_ORDER_MAX_COUNT = 10;
export const MEMORY_ORDER_ROUNDS = 10;
export const MEMORY_ORDER_INITIAL_LIVES = 2;
export const MEMORY_REPLAY_CHARGE_PER_ROUND = 25;
export const MEMORY_ORDER_PREVIEW_SECONDS = [6, 5, 4];
export const MEMORY_ORDER_SELECTION_SECONDS_PER_SYMBOL = 2;

export function getMemorySymbolCount(round) {
  const safeRound = Math.max(1, Number.isFinite(round) ? Math.floor(round) : 1);
  return Math.min(3 + Math.floor((safeRound - 1) / 3), MEMORY_ORDER_MAX_COUNT);
}

export function getMemoryPreviewSeconds(round) {
  const safeRound = Math.max(1, Number.isFinite(round) ? Math.floor(round) : 1);
  return MEMORY_ORDER_PREVIEW_SECONDS[(safeRound - 1) % MEMORY_ORDER_PREVIEW_SECONDS.length];
}

export function getMemorySelectionSeconds(count) {
  const safeCount = Math.max(0, Number.isFinite(count) ? Math.floor(count) : 0);
  return safeCount * MEMORY_ORDER_SELECTION_SECONDS_PER_SYMBOL;
}

export function shouldUpdateMemoryBest(currentBest, completedRound) {
  const safeBest = Math.max(0, Number.isFinite(currentBest) ? Math.floor(currentBest) : 0);
  const safeCompletedRound = Math.max(0, Number.isFinite(completedRound) ? Math.floor(completedRound) : 0);
  return safeCompletedRound > safeBest;
}

export function createMemorySequence(symbols, count, randomFn = Math.random) {
  if (!Array.isArray(symbols) || symbols.length === 0) return [];
  const safeCount = Math.max(0, Number.isFinite(count) ? Math.floor(count) : 0);
  return Array.from({ length: safeCount }, () => {
    const randomValue = Number(randomFn());
    const normalizedRandom = Number.isFinite(randomValue) ? Math.min(Math.max(randomValue, 0), 0.999999999999) : 0;
    const index = Math.floor(normalizedRandom * symbols.length);
    return symbols[index];
  });
}

export function createMemoryRound(round, symbols, randomFn = Math.random) {
  const count = getMemorySymbolCount(round);
  const previewSeconds = getMemoryPreviewSeconds(round);
  const selectionSeconds = getMemorySelectionSeconds(count);
  const sequence = createMemorySequence(symbols, count, randomFn);

  return { count, previewSeconds, selectionSeconds, sequence };
}

export function evaluateMemoryChoice(sequence, step, symbolId) {
  const expectedSymbol = sequence?.[step];
  const correct = Boolean(expectedSymbol && expectedSymbol.id === symbolId);
  const nextStep = correct ? step + 1 : step;

  return {
    correct,
    nextStep,
    complete: correct && nextStep === sequence.length,
  };
}

export function getMemoryRoundAward(count, currentCombo = 0) {
  const safeCount = Math.max(1, Math.floor(Number(count) || 1));
  const combo = Math.max(0, Math.floor(Number(currentCombo) || 0)) + 1;
  const award = getComboAward(safeCount * 100, combo, { maxMultiplier: 3 });
  return { ...award, combo };
}

export function chargeMemoryReplayGauge(currentGauge) {
  return Math.min(100, Math.max(0, Number(currentGauge) || 0) + MEMORY_REPLAY_CHARGE_PER_ROUND);
}

export function resolveMemoryFailure({ lives, replayGauge }) {
  const safeLives = Math.max(0, Math.floor(Number(lives) || 0));
  const safeGauge = Math.min(100, Math.max(0, Number(replayGauge) || 0));
  if (safeGauge >= 100) {
    return { status: "replay", lives: safeLives, replayGauge: 0 };
  }
  if (safeLives > 1) {
    return { status: "life", lives: safeLives - 1, replayGauge: safeGauge };
  }
  return { status: "over", lives: 0, replayGauge: safeGauge };
}
