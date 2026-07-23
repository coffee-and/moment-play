import { Game2048 } from "../games/game-2048/Game2048.jsx";
import { FlappyGame } from "../games/flappy/FlappyGame.jsx";
import { MemoryOrderGame } from "../games/memory/MemoryOrderGame.jsx";
import { OmokGame } from "../games/omok/OmokGame.jsx";
import { SudokuLevelGame } from "../games/sudoku/SudokuLevelGame.jsx";
import { TimingTapGame } from "../games/timing-tap/TimingTapGame.jsx";
import { GlowSequenceGame } from "../games/glow-sequence/GlowSequenceGame.jsx";
import { MoonMirrorGame } from "../games/moon-mirror/MoonMirrorGame.jsx";
import { NonogramGame } from "../games/nonogram/NonogramGame.jsx";
import { StarTraceGame } from "../games/star-trace/StarTraceGame.jsx";

export const MINIGAME_COMPONENTS = {
  "2048": Game2048,
  flappy: FlappyGame,
  memory: MemoryOrderGame,
  sudoku: SudokuLevelGame,
  omok: OmokGame,
  "timing-tap": TimingTapGame,
  "glow-sequence": GlowSequenceGame,
  "star-trace": StarTraceGame,
  "moon-mirror": MoonMirrorGame,
  nonogram: NonogramGame,
};

export function getMinigameComponent(gameId) {
  return MINIGAME_COMPONENTS[gameId] ?? null;
}
