import { Game2048 } from "../games/game-2048/Game2048.jsx";
import { MemoryOrderGame } from "../games/memory/MemoryOrderGame.jsx";
import { OmokGame } from "../games/omok/OmokGame.jsx";
import { SudokuLevelGame } from "../games/sudoku/SudokuLevelGame.jsx";
import { SnakeGame } from "../games/snake/SnakeGame.jsx";
import { TimingTapGame } from "../games/timing-tap/TimingTapGame.jsx";

export const MINIGAME_COMPONENTS = {
  "2048": Game2048,
  memory: MemoryOrderGame,
  sudoku: SudokuLevelGame,
  omok: OmokGame,
  snake: SnakeGame,
  "timing-tap": TimingTapGame,
};

export function getMinigameComponent(gameId) {
  return MINIGAME_COMPONENTS[gameId] ?? null;
}
