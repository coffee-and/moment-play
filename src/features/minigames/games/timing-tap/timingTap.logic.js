import { getComboAward } from "../../shared/gameProgression.js";

export const TIMING_TAP_ROUNDS = 10;
export const TIMING_TAP_MAX_SCORE = 25000;

const ROUND_DURATION_MS = [1680, 1540, 1400, 1260, 1140, 1060, 990, 930, 875, 830];
const ROUND_TARGET_WIDTH = [20, 18.5, 17, 15.5, 14, 13, 12, 11, 10, 9];

export function getTimingRoundConfig(round, random = Math.random, focusBonus = 0) {
  const safeRound = Math.max(1, Math.min(TIMING_TAP_ROUNDS, round));
  const targetWidth = Math.min(24, ROUND_TARGET_WIDTH[safeRound - 1] + Math.max(0, focusBonus));
  const targetCenter = 18 + random() * 64;
  return {
    durationMs: ROUND_DURATION_MS[safeRound - 1],
    targetCenter,
    targetWidth,
    focusAssisted: focusBonus > 0,
  };
}

export function getNeedlePosition(elapsedMs, durationMs) {
  const cycle = Math.max(1, durationMs);
  const progress = (elapsedMs % cycle) / cycle;
  return progress <= 0.5 ? progress * 200 : (1 - progress) * 200;
}

export function judgeTiming(position, targetCenter, targetWidth) {
  const halfWidth = targetWidth / 2;
  const distance = Math.abs(position - targetCenter);
  const normalizedDistance = distance / halfWidth;

  if (normalizedDistance <= 0.18) {
    return { grade: "PERFECT", score: 1000 };
  }
  if (normalizedDistance <= 1) {
    return {
      grade: "GOOD",
      score: Math.max(700, Math.round(1000 - normalizedDistance * 300)),
    };
  }
  if (normalizedDistance <= 2) {
    return {
      grade: "CLOSE",
      score: Math.max(200, Math.round(700 - (normalizedDistance - 1) * 500)),
    };
  }
  return { grade: "MISS", score: 0 };
}

export function scoreTimingResult(judgement, currentPerfectCombo = 0) {
  const isPerfect = judgement?.grade === "PERFECT";
  const combo = isPerfect ? Math.max(0, currentPerfectCombo) + 1 : 0;
  const award = isPerfect
    ? getComboAward(judgement.score, combo, { step: 0.5, maxMultiplier: 3 })
    : { points: Math.max(0, judgement?.score ?? 0), multiplier: 1 };

  return {
    ...judgement,
    combo,
    multiplier: award.multiplier,
    points: award.points,
  };
}
