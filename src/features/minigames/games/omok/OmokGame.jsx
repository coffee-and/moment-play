import { GameStage } from "../../shared/components/GameStage.jsx";
import { createInitialBoard, OMOK_BOARD_SIZE } from "./omok.utils.js";

const DEFAULT_GAME_META = {
  eyebrow: "BOARD / STRATEGY",
  title: "Omok / Gomoku",
  description: "Five-in-a-row game area prepared for a future implementation.",
};

export function OmokGame({ game = DEFAULT_GAME_META }) {
  const board = createInitialBoard();

  return (
    <GameStage className="omok-game" eyebrow={game.eyebrow} title={game.title} description={game.description} ariaLabel={game.title}>
      <div className="omok-game__placeholder" role="status">
        <strong>Coming soon</strong>
        <span>{OMOK_BOARD_SIZE}x{OMOK_BOARD_SIZE} board utilities are ready for Omok rules.</span>
        <span>{board.length} rows initialized.</span>
      </div>
    </GameStage>
  );
}
