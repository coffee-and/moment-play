export const TIMING_TAP_ROUNDS = 5;

export function getTimingRoundConfig(round, random = Math.random) {
  const safeRound = Math.max(1, Math.min(TIMING_TAP_ROUNDS, round));
  const targetWidth = Math.max(9, 20 - safeRound * 2.2);
  const targetCenter = 18 + random() * 64;
  return {
    durationMs: Math.max(820, 1660 - safeRound * 150),
    targetCenter,
    targetWidth,
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
    return { grade: "PERFECT", score: 100 };
  }
  if (normalizedDistance <= 1) {
    return {
      grade: "GOOD",
      score: Math.max(70, Math.round(100 - normalizedDistance * 30)),
    };
  }
  if (normalizedDistance <= 2) {
    return {
      grade: "CLOSE",
      score: Math.max(20, Math.round(70 - (normalizedDistance - 1) * 50)),
    };
  }
  return { grade: "MISS", score: 0 };
}
