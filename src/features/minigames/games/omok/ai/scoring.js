import { OMOK_BOARD_SIZE } from "../omok.constants.js";
import { OMOK_DIRECTIONS, getNextStone, isInBounds, placeStone, playMove } from "../domain/index.js";

function countSide(board, position, stone, [rowStep, colStep], multiplier) {
  let count = 0;
  let row = position.row + rowStep * multiplier;
  let col = position.col + colStep * multiplier;

  while (board[row]?.[col] === stone) {
    count += 1;
    row += rowStep * multiplier;
    col += colStep * multiplier;
  }

  const nextPosition = { row, col };
  return {
    count,
    open: isInBounds(nextPosition) && board[row][col] === null,
  };
}

function getDirectionShape(board, position, stone, direction) {
  const before = countSide(board, position, stone, direction, -1);
  const after = countSide(board, position, stone, direction, 1);

  return {
    length: before.count + 1 + after.count,
    openEnds: Number(before.open) + Number(after.open),
  };
}

function scoreShape({ length, openEnds }) {
  if (length >= 5) return 1_000_000;
  if (length === 4 && openEnds === 2) return 80_000;
  if (length === 4 && openEnds === 1) return 18_000;
  if (length === 3 && openEnds === 2) return 7_000;
  if (length === 3 && openEnds === 1) return 1_400;
  if (length === 2 && openEnds === 2) return 420;
  if (length === 2 && openEnds === 1) return 90;
  if (length === 1 && openEnds === 2) return 14;
  return 1;
}

function centerBonus({ row, col }) {
  const center = Math.floor(OMOK_BOARD_SIZE / 2);
  const distance = Math.abs(row - center) + Math.abs(col - center);
  return Math.max(0, OMOK_BOARD_SIZE - distance);
}

export function scoreMoveForStone(board, position, stone, gameMode) {
  const result = playMove(board, position, stone, gameMode);
  if (!result.valid) return Number.NEGATIVE_INFINITY;
  if (result.winner === stone) return 1_000_000_000;

  const nextBoard = placeStone(board, position, stone);
  const shapeScore = OMOK_DIRECTIONS.reduce(
    (total, direction) => total + scoreShape(getDirectionShape(nextBoard, position, stone, direction)),
    0,
  );

  return shapeScore + centerBonus(position);
}

export function scoreComputerMove(board, position, computerStone, gameMode) {
  const attack = scoreMoveForStone(board, position, computerStone, gameMode);
  if (!Number.isFinite(attack)) return attack;

  const opponent = getNextStone(computerStone);
  const rawDefense = scoreMoveForStone(board, position, opponent, gameMode);
  const defense = Number.isFinite(rawDefense) ? rawDefense : 0;
  const defensiveWeight = defense >= 1_000_000_000 ? 1.2 : 0.92;

  return attack + defense * defensiveWeight;
}
