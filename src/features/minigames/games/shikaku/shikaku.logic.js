export const SHIKAKU_PUZZLES = [
  {
    size: 5,
    clues: [
      { row: 0, col: 0, value: 4 },
      { row: 1, col: 3, value: 6 },
      { row: 3, col: 0, value: 3 },
      { row: 2, col: 1, value: 4 },
      { row: 4, col: 4, value: 6 },
      { row: 4, col: 2, value: 2 },
    ],
  },
  {
    size: 5,
    clues: [
      { row: 1, col: 1, value: 4 },
      { row: 0, col: 4, value: 6 },
      { row: 2, col: 0, value: 3 },
      { row: 3, col: 2, value: 4 },
      { row: 2, col: 3, value: 6 },
      { row: 4, col: 1, value: 2 },
    ],
  },
  {
    size: 6,
    clues: [
      { row: 0, col: 1, value: 6 },
      { row: 1, col: 4, value: 6 },
      { row: 2, col: 0, value: 2 },
      { row: 3, col: 2, value: 6 },
      { row: 2, col: 5, value: 4 },
      { row: 4, col: 0, value: 6 },
      { row: 4, col: 4, value: 4 },
      { row: 5, col: 5, value: 2 },
    ],
  },
];

export function createRectangle(first, second) {
  return {
    top: Math.min(first.row, second.row),
    bottom: Math.max(first.row, second.row),
    left: Math.min(first.col, second.col),
    right: Math.max(first.col, second.col),
  };
}

function rectangleArea(rectangle) {
  return (rectangle.bottom - rectangle.top + 1) * (rectangle.right - rectangle.left + 1);
}

export function rectangleContains(rectangle, row, col) {
  return row >= rectangle.top
    && row <= rectangle.bottom
    && col >= rectangle.left
    && col <= rectangle.right;
}

function rectanglesOverlap(first, second) {
  return first.left <= second.right
    && first.right >= second.left
    && first.top <= second.bottom
    && first.bottom >= second.top;
}

export function validateShikakuRectangle(rectangle, clues, rectangles = []) {
  if (rectangles.some((claimed) => rectanglesOverlap(rectangle, claimed))) {
    return { valid: false, reason: "이미 나눈 영역과 겹쳐요." };
  }
  const containedClues = clues.filter((clue) => rectangleContains(rectangle, clue.row, clue.col));
  if (containedClues.length !== 1) {
    return { valid: false, reason: "사각형 안에는 숫자가 하나만 있어야 해요." };
  }
  if (rectangleArea(rectangle) !== containedClues[0].value) {
    return { valid: false, reason: `넓이가 ${containedClues[0].value}칸이어야 해요.` };
  }
  return { valid: true, clue: containedClues[0] };
}

export function isShikakuComplete(size, rectangles) {
  const covered = new Set();
  rectangles.forEach((rectangle) => {
    for (let row = rectangle.top; row <= rectangle.bottom; row += 1) {
      for (let col = rectangle.left; col <= rectangle.right; col += 1) {
        covered.add(`${row}:${col}`);
      }
    }
  });
  return covered.size === size * size;
}

export function solveShikaku(puzzle) {
  const candidates = puzzle.clues.flatMap((clue) => {
    const rectangles = [];
    for (let height = 1; height <= clue.value; height += 1) {
      if (clue.value % height !== 0) continue;
      const width = clue.value / height;
      for (let top = clue.row - height + 1; top <= clue.row; top += 1) {
        for (let left = clue.col - width + 1; left <= clue.col; left += 1) {
          const rectangle = {
            top,
            bottom: top + height - 1,
            left,
            right: left + width - 1,
          };
          if (
            rectangle.top < 0
            || rectangle.left < 0
            || rectangle.bottom >= puzzle.size
            || rectangle.right >= puzzle.size
          ) continue;
          if (validateShikakuRectangle(rectangle, puzzle.clues).valid) rectangles.push(rectangle);
        }
      }
    }
    return rectangles;
  });

  function search(selected, covered) {
    if (covered.size === puzzle.size * puzzle.size) return selected;
    const nextIndex = Array.from({ length: puzzle.size * puzzle.size }, (_, index) => index)
      .find((index) => !covered.has(index));
    const row = Math.floor(nextIndex / puzzle.size);
    const col = nextIndex % puzzle.size;
    const available = candidates.filter((rectangle) => (
      rectangleContains(rectangle, row, col)
      && [...covered].every((index) => !rectangleContains(
        rectangle,
        Math.floor(index / puzzle.size),
        index % puzzle.size,
      ))
    ));

    for (const rectangle of available) {
      const nextCovered = new Set(covered);
      for (let nextRow = rectangle.top; nextRow <= rectangle.bottom; nextRow += 1) {
        for (let nextCol = rectangle.left; nextCol <= rectangle.right; nextCol += 1) {
          nextCovered.add(nextRow * puzzle.size + nextCol);
        }
      }
      const result = search([...selected, rectangle], nextCovered);
      if (result) return result;
    }
    return null;
  }

  return search([], new Set()) ?? [];
}
