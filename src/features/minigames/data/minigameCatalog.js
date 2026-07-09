import { Game2048 } from "../games/game-2048/Game2048.jsx";
import { MemoryOrderGame } from "../games/memory/MemoryOrderGame.jsx";
import { OmokGame } from "../games/omok/OmokGame.jsx";
import { SudokuLevelGame } from "../games/sudoku/SudokuLevelGame.jsx";

export const MINIGAME_STATUS = {
  AVAILABLE: "available",
  COMING_SOON: "comingSoon",
  IN_PROGRESS: "inProgress",
};

export const MINIGAME_CATALOG = [
  {
    id: "2048",
    title: "2048",
    description: "Merge number tiles and clear each target.",
    status: MINIGAME_STATUS.AVAILABLE,
    path: "/minigames/2048",
    icon: "2048",
    category: "Puzzle",
    component: Game2048,
  },
  {
    id: "memory",
    title: "Memory Game",
    description: "Remember the sequence and choose symbols in order.",
    status: MINIGAME_STATUS.AVAILABLE,
    path: "/minigames/memory",
    icon: "MEM",
    category: "Memory",
    component: MemoryOrderGame,
  },
  {
    id: "sudoku",
    title: "Sudoku",
    description: "Fill the board by level and track your best time.",
    status: MINIGAME_STATUS.AVAILABLE,
    path: "/minigames/sudoku",
    icon: "SDK",
    category: "Puzzle",
    component: SudokuLevelGame,
  },
  {
    id: "omok",
    title: "Omok / Gomoku",
    description: "A board-game slot prepared for a future five-in-a-row game.",
    status: MINIGAME_STATUS.COMING_SOON,
    path: "/minigames/omok",
    icon: "5",
    category: "Board",
    component: OmokGame,
  },
  {
    id: "future-puzzle",
    title: "Future Puzzle Game",
    description: "Reserved for the next puzzle experiment.",
    status: MINIGAME_STATUS.COMING_SOON,
    path: "/minigames/future-puzzle",
    icon: "+",
    category: "Puzzle",
  },
];

export const DEFAULT_MINIGAME_ID =
  MINIGAME_CATALOG.find((game) => game.status === MINIGAME_STATUS.AVAILABLE)?.id ?? MINIGAME_CATALOG[0]?.id;

export function getMinigameById(id) {
  return MINIGAME_CATALOG.find((game) => game.id === id) ?? null;
}
