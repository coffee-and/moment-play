import { lazyNamedComponent } from "../../../shared/components/lazyNamedComponent.js";

const MINIGAME_MODULES = {
  "2048": {
    load: () => import("../games/game-2048/Game2048.jsx"),
    exportName: "Game2048",
  },
  flappy: {
    load: () => import("../games/flappy/FlappyGame.jsx"),
    exportName: "FlappyGame",
  },
  memory: {
    load: () => import("../games/memory/MemoryOrderGame.jsx"),
    exportName: "MemoryOrderGame",
  },
  sudoku: {
    load: () => import("../games/sudoku/SudokuLevelGame.jsx"),
    exportName: "SudokuLevelGame",
  },
  omok: {
    load: () => import("../games/omok/OmokGame.jsx"),
    exportName: "OmokGame",
  },
  "timing-tap": {
    load: () => import("../games/timing-tap/TimingTapGame.jsx"),
    exportName: "TimingTapGame",
  },
  "glow-sequence": {
    load: () => import("../games/glow-sequence/GlowSequenceGame.jsx"),
    exportName: "GlowSequenceGame",
  },
  solitaire: {
    load: () => import("../games/solitaire/SolitaireGame.jsx"),
    exportName: "SolitaireGame",
  },
  lits: {
    load: () => import("../games/lits/LitsGame.jsx"),
    exportName: "LitsGame",
  },
  shikaku: {
    load: () => import("../games/shikaku/ShikakuGame.jsx"),
    exportName: "ShikakuGame",
  },
  minesweeper: {
    load: () => import("../games/minesweeper/MinesweeperGame.jsx"),
    exportName: "MinesweeperGame",
  },
  set: {
    load: () => import("../games/set/SetGame.jsx"),
    exportName: "SetGame",
  },
  mosaic: {
    load: () => import("../games/mosaic/MosaicGame.jsx"),
    exportName: "MosaicGame",
  },
  "block-blast": {
    load: () => import("../games/block-blast/BlockBlastGame.jsx"),
    exportName: "BlockBlastGame",
  },
};

const MINIGAME_COMPONENTS = Object.fromEntries(
  Object.entries(MINIGAME_MODULES).map(([gameId, definition]) => [
    gameId,
    lazyNamedComponent(definition.load, definition.exportName),
  ]),
);

export function hasMinigameComponent(gameId) {
  return Object.hasOwn(MINIGAME_MODULES, gameId);
}

export function getMinigameComponent(gameId) {
  return MINIGAME_COMPONENTS[gameId] ?? null;
}
