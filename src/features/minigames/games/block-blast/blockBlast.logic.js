export const BLOCK_BLAST_SIZE = 8;

const BLOCK_PIECES = [
  { id: "single", cells: [[0, 0]] },
  { id: "line-2-h", cells: [[0, 0], [0, 1]] },
  { id: "line-2-v", cells: [[0, 0], [1, 0]] },
  { id: "line-3-h", cells: [[0, 0], [0, 1], [0, 2]] },
  { id: "line-3-v", cells: [[0, 0], [1, 0], [2, 0]] },
  { id: "line-4-h", cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: "line-4-v", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: "square", cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: "l-small", cells: [[0, 0], [1, 0], [1, 1]] },
  { id: "l-large", cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: "t", cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: "zig", cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
];

export function createBlockBoard() {
  return Array(BLOCK_BLAST_SIZE * BLOCK_BLAST_SIZE).fill(0);
}

export function createBlockPieces(randomFn = Math.random) {
  return Array.from({ length: 3 }, (_, index) => ({
    ...BLOCK_PIECES[Math.floor(randomFn() * BLOCK_PIECES.length)],
    instanceId: `${Date.now()}-${index}-${Math.floor(randomFn() * 1_000_000)}`,
    color: index + 1,
  }));
}

export function canPlaceBlockPiece(board, piece, originRow, originCol) {
  return piece.cells.every(([rowOffset, colOffset]) => {
    const row = originRow + rowOffset;
    const col = originCol + colOffset;
    return row >= 0
      && row < BLOCK_BLAST_SIZE
      && col >= 0
      && col < BLOCK_BLAST_SIZE
      && board[row * BLOCK_BLAST_SIZE + col] === 0;
  });
}

export function placeBlockPiece(board, piece, originRow, originCol) {
  if (!canPlaceBlockPiece(board, piece, originRow, originCol)) {
    return { placed: false, board, clearedLines: 0, points: 0 };
  }
  const placedBoard = [...board];
  piece.cells.forEach(([rowOffset, colOffset]) => {
    placedBoard[(originRow + rowOffset) * BLOCK_BLAST_SIZE + originCol + colOffset] = piece.color;
  });

  const fullRows = [];
  const fullCols = [];
  for (let row = 0; row < BLOCK_BLAST_SIZE; row += 1) {
    if (Array.from({ length: BLOCK_BLAST_SIZE }, (_, col) => placedBoard[row * BLOCK_BLAST_SIZE + col])
      .every(Boolean)) fullRows.push(row);
  }
  for (let col = 0; col < BLOCK_BLAST_SIZE; col += 1) {
    if (Array.from({ length: BLOCK_BLAST_SIZE }, (_, row) => placedBoard[row * BLOCK_BLAST_SIZE + col])
      .every(Boolean)) fullCols.push(col);
  }

  const nextBoard = placedBoard.map((value, index) => {
    const row = Math.floor(index / BLOCK_BLAST_SIZE);
    const col = index % BLOCK_BLAST_SIZE;
    return fullRows.includes(row) || fullCols.includes(col) ? 0 : value;
  });
  const clearedLines = fullRows.length + fullCols.length;
  return {
    placed: true,
    board: nextBoard,
    clearedLines,
    points: piece.cells.length + clearedLines * 20 + Math.max(0, clearedLines - 1) * 10,
  };
}

export function hasBlockMove(board, pieces) {
  return pieces.filter(Boolean).some((piece) => {
    for (let row = 0; row < BLOCK_BLAST_SIZE; row += 1) {
      for (let col = 0; col < BLOCK_BLAST_SIZE; col += 1) {
        if (canPlaceBlockPiece(board, piece, row, col)) return true;
      }
    }
    return false;
  });
}
