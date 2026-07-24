export const LITS_SIZE = 6;
export const LITS_REGION_MAP = [
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 1, 1, 1,
  2, 2, 2, 3, 3, 3,
  2, 2, 2, 3, 3, 3,
  4, 4, 4, 5, 5, 5,
  4, 4, 4, 5, 5, 5,
];

export const LITS_SOLUTION = [
  0, 1, 2, 6,
  3, 4, 5, 10,
  12, 13, 14, 19,
  15, 16, 17, 21,
  24, 25, 26, 30,
  27, 28, 29, 34,
];

const BASE_SHAPES = {
  I: [[0, 0], [0, 1], [0, 2], [0, 3]],
  L: [[0, 0], [1, 0], [2, 0], [2, 1]],
  T: [[0, 0], [0, 1], [0, 2], [1, 1]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1]],
};

function normalizeCoordinates(coordinates) {
  const minRow = Math.min(...coordinates.map(([row]) => row));
  const minCol = Math.min(...coordinates.map(([, col]) => col));
  return coordinates
    .map(([row, col]) => [row - minRow, col - minCol])
    .sort(([rowA, colA], [rowB, colB]) => rowA - rowB || colA - colB)
    .map(([row, col]) => `${row}:${col}`)
    .join("|");
}

function createShapeVariants(shape) {
  const variants = new Set();
  [false, true].forEach((reflect) => {
    let coordinates = shape.map(([row, col]) => [row, reflect ? -col : col]);
    for (let rotation = 0; rotation < 4; rotation += 1) {
      variants.add(normalizeCoordinates(coordinates));
      coordinates = coordinates.map(([row, col]) => [col, -row]);
    }
  });
  return variants;
}

const SHAPE_VARIANTS = Object.fromEntries(
  Object.entries(BASE_SHAPES).map(([type, shape]) => [type, createShapeVariants(shape)]),
);

function areCellsConnected(indexes, size) {
  if (indexes.length === 0) return false;
  const cells = new Set(indexes);
  const visited = new Set([indexes[0]]);
  const queue = [indexes[0]];
  while (queue.length > 0) {
    const index = queue.shift();
    const row = Math.floor(index / size);
    const col = index % size;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([rowOffset, colOffset]) => {
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      const nextIndex = nextRow * size + nextCol;
      if (
        nextRow >= 0 && nextRow < size
        && nextCol >= 0 && nextCol < size
        && cells.has(nextIndex)
        && !visited.has(nextIndex)
      ) {
        visited.add(nextIndex);
        queue.push(nextIndex);
      }
    });
  }
  return visited.size === cells.size;
}

export function getLitsShapeType(indexes, size = LITS_SIZE) {
  if (indexes.length !== 4 || !areCellsConnected(indexes, size)) return null;
  const normalized = normalizeCoordinates(indexes.map((index) => [Math.floor(index / size), index % size]));
  return Object.entries(SHAPE_VARIANTS)
    .find(([, variants]) => variants.has(normalized))?.[0] ?? null;
}

export function validateLits(filledIndexes, regionMap = LITS_REGION_MAP, size = LITS_SIZE) {
  const filled = new Set(filledIndexes);
  const regionIds = [...new Set(regionMap)];
  const regionShapes = new Map();

  for (const regionId of regionIds) {
    const regionFilled = filledIndexes.filter((index) => regionMap[index] === regionId);
    if (regionFilled.length !== 4) {
      return { valid: false, reason: "각 영역에는 정확히 네 칸을 칠해야 해요." };
    }
    const shapeType = getLitsShapeType(regionFilled, size);
    if (!shapeType) {
      return { valid: false, reason: "각 영역은 L, I, T, S 중 하나의 모양이어야 해요." };
    }
    regionShapes.set(regionId, shapeType);
  }

  if (!areCellsConnected(filledIndexes, size)) {
    return { valid: false, reason: "칠한 모든 칸이 하나로 이어져야 해요." };
  }

  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const square = [
        row * size + col,
        row * size + col + 1,
        (row + 1) * size + col,
        (row + 1) * size + col + 1,
      ];
      if (square.every((index) => filled.has(index))) {
        return { valid: false, reason: "칠한 칸으로 2×2 정사각형을 만들 수 없어요." };
      }
    }
  }

  for (const index of filledIndexes) {
    const row = Math.floor(index / size);
    const col = index % size;
    [[1, 0], [0, 1]].forEach(([rowOffset, colOffset]) => {
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow >= size || nextCol >= size) return;
      const nextIndex = nextRow * size + nextCol;
      const region = regionMap[index];
      const nextRegion = regionMap[nextIndex];
      if (
        filled.has(nextIndex)
        && region !== nextRegion
        && regionShapes.get(region) === regionShapes.get(nextRegion)
      ) {
        regionShapes.set("touchingSameShape", true);
      }
    });
  }
  if (regionShapes.get("touchingSameShape")) {
    return { valid: false, reason: "같은 모양의 테트로미노끼리는 변으로 닿을 수 없어요." };
  }

  return { valid: true, shapes: regionShapes };
}
