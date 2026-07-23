const NONOGRAM_SIZES = { easy: 5, normal: 8, hard: 10 };

function seededRandom(seed) {
  let value = Math.max(1, Math.floor(Number(seed) || 1)) >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

export function getNonogramSize(difficulty) {
  return NONOGRAM_SIZES[difficulty] ?? NONOGRAM_SIZES.easy;
}

export function getNonogramLineClue(line) {
  const clue = [];
  let run = 0;
  line.forEach((filled) => {
    if (filled) run += 1;
    else if (run) {
      clue.push(run);
      run = 0;
    }
  });
  if (run) clue.push(run);
  return clue.length ? clue : [0];
}

export function getNonogramClues(cells, size) {
  const rows = Array.from({ length: size }, (_, row) => (
    getNonogramLineClue(Array.from({ length: size }, (__, column) => Boolean(cells[row * size + column])))
  ));
  const columns = Array.from({ length: size }, (_, column) => (
    getNonogramLineClue(Array.from({ length: size }, (__, row) => Boolean(cells[row * size + column])))
  ));
  return { columns, rows };
}

export function createNonogramPuzzle(difficulty, round) {
  const size = getNonogramSize(difficulty);
  const difficultySeed = difficulty === "hard" ? 7000 : difficulty === "normal" ? 5000 : 3000;
  const random = seededRandom(difficultySeed + Math.max(1, Number(round) || 1) * 173);
  const cells = Array.from({ length: size * size }, () => random() < 0.46);

  for (let row = 0; row < size; row += 1) {
    if (!cells.slice(row * size, (row + 1) * size).some(Boolean)) cells[row * size + (row * 3 + round) % size] = true;
  }
  for (let column = 0; column < size; column += 1) {
    if (!Array.from({ length: size }, (_, row) => cells[row * size + column]).some(Boolean)) {
      cells[((column * 5 + round) % size) * size + column] = true;
    }
  }

  return { cells, clues: getNonogramClues(cells, size), size };
}

function cluesEqual(left, right) {
  return left.length === right.length && left.every((line, index) => (
    line.length === right[index].length && line.every((value, clueIndex) => value === right[index][clueIndex])
  ));
}

export function isNonogramSolved(cellStates, targetClues, size) {
  const filled = cellStates.map((state) => state === 1);
  const current = getNonogramClues(filled, size);
  return cluesEqual(current.rows, targetClues.rows) && cluesEqual(current.columns, targetClues.columns);
}
