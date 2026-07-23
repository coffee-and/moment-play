const MIRROR_CONFIG = {
  easy: { size: 4, axes: ["vertical"] },
  normal: { size: 6, axes: ["vertical", "horizontal"] },
  hard: { size: 8, axes: ["vertical", "horizontal", "diagonal"] },
};

function seededRandom(seed) {
  let value = Math.max(1, Math.floor(Number(seed) || 1)) % 2147483647;
  return () => {
    value = value * 48271 % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function getMoonMirrorConfig(difficulty) {
  return MIRROR_CONFIG[difficulty] ?? MIRROR_CONFIG.easy;
}

export function getMirrorCell(index, size, axis) {
  const row = Math.floor(index / size);
  const column = index % size;
  if (axis === "horizontal") return (size - 1 - row) * size + column;
  if (axis === "diagonal") return column * size + row;
  return row * size + (size - 1 - column);
}

export function isMoonMirrorSourceCell(index, size, axis) {
  const row = Math.floor(index / size);
  const column = index % size;
  if (axis === "horizontal") return row < size / 2;
  if (axis === "diagonal") return column < row;
  return column < size / 2;
}

export function createMoonMirrorPuzzle(difficulty, round) {
  const config = getMoonMirrorConfig(difficulty);
  const roundNumber = Math.max(1, Math.floor(Number(round) || 1));
  const axis = config.axes[(roundNumber - 1) % config.axes.length];
  const random = seededRandom(config.size * 1000 + roundNumber * 131 + config.axes.indexOf(axis) * 17);
  const sourceActive = [];
  const targetActive = [];

  for (let index = 0; index < config.size * config.size; index += 1) {
    if (!isMoonMirrorSourceCell(index, config.size, axis)) continue;
    if (random() < 0.46) {
      sourceActive.push(index);
      targetActive.push(getMirrorCell(index, config.size, axis));
    }
  }

  if (!sourceActive.length) {
    const fallback = Array.from({ length: config.size * config.size }, (_, index) => index)
      .find((index) => isMoonMirrorSourceCell(index, config.size, axis));
    sourceActive.push(fallback);
    targetActive.push(getMirrorCell(fallback, config.size, axis));
  }

  return { axis, size: config.size, sourceActive, targetActive };
}

export function isMoonMirrorSolved(selectedCells, targetActive) {
  const selected = [...selectedCells].sort((a, b) => a - b);
  const target = [...targetActive].sort((a, b) => a - b);
  return selected.length === target.length && selected.every((cell, index) => cell === target[index]);
}
