const STAR_TRACE_CONFIG = {
  easy: { pointCount: 5, tolerance: 30, showGuide: true },
  normal: { pointCount: 7, tolerance: 24, showGuide: true },
  hard: { pointCount: 10, tolerance: 20, showGuide: false },
};

function seededRandom(seed) {
  let value = Math.max(1, Math.floor(Number(seed) || 1)) % 2147483647;
  return () => {
    value = value * 16807 % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function getStarTraceConfig(difficulty) {
  return STAR_TRACE_CONFIG[difficulty] ?? STAR_TRACE_CONFIG.easy;
}

export function createStarTracePuzzle(difficulty, round) {
  const config = getStarTraceConfig(difficulty);
  const difficultySeed = difficulty === "hard" ? 3000 : difficulty === "normal" ? 2000 : 1000;
  const random = seededRandom(difficultySeed + Math.max(1, Number(round) || 1) * 97);
  const points = [];

  while (points.length < config.pointCount) {
    const candidate = {
      x: 10 + random() * 80,
      y: 12 + random() * 76,
    };
    const isFarEnough = points.every((point) => Math.hypot(point.x - candidate.x, point.y - candidate.y) >= 17);
    if (isFarEnough) points.push(candidate);
  }

  return { ...config, points };
}

export function evaluateStarTraceChoice(expectedIndex, chosenIndex, totalPoints) {
  const expected = Math.max(0, Math.floor(Number(expectedIndex) || 0));
  const chosen = Math.max(0, Math.floor(Number(chosenIndex) || 0));
  const total = Math.max(1, Math.floor(Number(totalPoints) || 1));
  const correct = expected === chosen;
  return {
    correct,
    complete: correct && expected + 1 >= total,
    nextIndex: correct ? Math.min(total, expected + 1) : expected,
  };
}
