export const OMOK_BOARD_SIZE = 15;

export function createInitialBoard(size = OMOK_BOARD_SIZE) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}
