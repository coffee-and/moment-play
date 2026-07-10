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
    description: "같은 숫자 타일을 합쳐 목표 타일까지 도전해요.",
    status: MINIGAME_STATUS.AVAILABLE,
    path: "/minigames/2048",
    icon: "2048",
    category: "Number",
    component: Game2048,
  },
  {
    id: "memory",
    title: "순서 맞추기",
    description: "순서를 기억하고 같은 순서로 선택해요.",
    status: MINIGAME_STATUS.AVAILABLE,
    path: "/minigames/memory",
    icon: "SEQ",
    category: "Memory",
    component: MemoryOrderGame,
  },
  {
    id: "sudoku",
    title: "Sudoku",
    description: "난이도별 퍼즐을 풀고 최고 시간을 줄여요.",
    status: MINIGAME_STATUS.AVAILABLE,
    path: "/minigames/sudoku",
    icon: "SDK",
    category: "Puzzle",
    component: SudokuLevelGame,
  },
  {
    id: "omok",
    title: "Omok",
    description: "초대 또는 매칭으로 이어질 1:1 보드 UI예요.",
    status: MINIGAME_STATUS.IN_PROGRESS,
    path: "/minigames/omok",
    icon: "5",
    category: "Online",
    component: OmokGame,
  },
  {
    id: "future-puzzle",
    title: "Future Puzzle",
    description: "다음 미니게임을 위한 준비 슬롯이에요.",
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
