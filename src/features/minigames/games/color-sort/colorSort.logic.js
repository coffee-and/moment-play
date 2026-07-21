export const COLOR_SORT_CAPACITY = 4;
export const COLOR_SORT_MAX_LEVEL = 5;

export const COLOR_SORT_PALETTE = [
  { id: "yellow", value: "#F3C74F" },
  { id: "orange", value: "#F07A2D" },
  { id: "pink", value: "#D957A0" },
  { id: "purple", value: "#8A6BCB" },
  { id: "deep-blue", value: "#315DB7" },
  { id: "sky-blue", value: "#72B7E8" },
  { id: "teal", value: "#43A99A" },
  { id: "lime", value: "#93BE4F" },
];

export function getColorSortLevel(level) {
  const safeLevel = Math.min(COLOR_SORT_MAX_LEVEL, Math.max(1, Math.floor(Number(level) || 1)));
  const colorCount = safeLevel + 3;
  return {
    level: safeLevel,
    colorCount,
    tubeCount: colorCount + 2,
    emptyTubes: 2,
    capacity: COLOR_SORT_CAPACITY,
  };
}

function createSeededRandom(seed) {
  let value = Math.max(1, Math.floor(Number(seed) || 1)) >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function cloneTubes(tubes) {
  return tubes.map((tube) => [...tube]);
}

function topGroupSize(tube) {
  if (!tube?.length) return 0;
  const top = tube[tube.length - 1];
  let count = 1;
  for (let index = tube.length - 2; index >= 0 && tube[index] === top; index -= 1) count += 1;
  return count;
}

export function moveColorBlocks(tubes, fromIndex, toIndex, capacity = COLOR_SORT_CAPACITY) {
  if (!Array.isArray(tubes) || fromIndex === toIndex) return { moved: 0, tubes };
  const source = tubes[fromIndex];
  const destination = tubes[toIndex];
  if (!source?.length || !destination || destination.length >= capacity) return { moved: 0, tubes };

  const color = source[source.length - 1];
  const destinationColor = destination[destination.length - 1];
  if (destinationColor && destinationColor !== color) return { moved: 0, tubes };

  const amount = Math.min(topGroupSize(source), capacity - destination.length);
  if (amount <= 0) return { moved: 0, tubes };
  const next = cloneTubes(tubes);
  const movedBlocks = next[fromIndex].splice(next[fromIndex].length - amount, amount);
  next[toIndex].push(...movedBlocks);
  return { moved: amount, tubes: next };
}

function shuffle(values, random) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function createColorSortBoard(level, seed = level * 7919) {
  const config = getColorSortLevel(level);
  const random = createSeededRandom(seed);
  const colors = shuffle(
    COLOR_SORT_PALETTE.slice(0, config.colorCount).map((color) => color.id),
    random,
  );
  const mixedTubes = Array.from({ length: config.colorCount }, (_, tubeIndex) => (
    Array.from({ length: COLOR_SORT_CAPACITY }, (_, slotIndex) => (
      colors[(tubeIndex + slotIndex) % colors.length]
    ))
  ));

  return [...shuffle(mixedTubes, random), [], []];
}

export function isColorSortSolved(tubes, capacity = COLOR_SORT_CAPACITY) {
  if (!Array.isArray(tubes)) return false;
  return tubes.every((tube) => (
    tube.length === 0
    || (tube.length === capacity && tube.every((color) => color === tube[0]))
  ));
}
