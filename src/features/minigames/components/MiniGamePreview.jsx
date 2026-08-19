import starFlightCardPreview from "../../../assets/figma/star-flight-card-preview.png";
import { catalogClassName as cx } from "../pages/catalogStyles.js";

const PREVIEW_2048_TILES = [2, 4, 8, 16, 0, 32, 64, 0, 0, 128, 256, 0, 0, 0, 512, 1024];
const PREVIEW_SUDOKU_CELLS = [1, "", 5, "", "", 7, "", 3, 4, "", 9, "", "", 2, "", 8];
const PREVIEW_MEMORY_SYMBOLS = ["circle", "diamond", "heart", "star"];
const PREVIEW_GLOW_CELLS = Array.from({ length: 16 }, (_, index) => index);
const PREVIEW_GRID_CELLS = Array.from({ length: 16 }, (_, index) => index);
const PREVIEW_SOLITAIRE_CARDS = [
  { rank: "K", suit: "♠", color: "black" },
  { rank: "Q", suit: "♥", color: "red" },
  { rank: "J", suit: "♣", color: "black" },
];

export function MiniGamePreview({ gameId }) {
  if (gameId === "2048") {
    return (
      <span className={cx("game-card-preview is-2048")}>
        {PREVIEW_2048_TILES.map((value, index) => (
          <span className={cx("preview-2048-tile")} data-value={value || undefined} key={index}>{value || ""}</span>
        ))}
      </span>
    );
  }

  if (gameId === "memory") {
    return (
      <span className={cx("game-card-preview is-memory")}>
        {PREVIEW_MEMORY_SYMBOLS.map((symbol) => <span className={cx(`preview-memory-symbol is-${symbol}`)} key={symbol} />)}
      </span>
    );
  }

  if (gameId === "sudoku") {
    return (
      <span className={cx("game-card-preview is-sudoku")}>
        {PREVIEW_SUDOKU_CELLS.map((value, index) => <span key={index}>{value}</span>)}
      </span>
    );
  }

  if (gameId === "omok") {
    return (
      <span className={cx("game-card-preview is-omok")}>
        <span className={cx("preview-stone is-black is-one")} />
        <span className={cx("preview-stone is-white is-two")} />
        <span className={cx("preview-stone is-black is-three")} />
        <span className={cx("preview-stone is-white is-four")} />
      </span>
    );
  }

  if (gameId === "flappy") {
    return <img className={cx("game-card-preview is-flappy")} src={starFlightCardPreview} alt="" />;
  }

  if (gameId === "timing-tap") {
    return (
      <span className={cx("game-card-preview is-timing")}>
        <span className={cx("preview-target")} />
        <span className={cx("preview-needle")} />
      </span>
    );
  }

  if (gameId === "glow-sequence") {
    return (
      <span className={cx("game-card-preview is-glow-sequence")}>
        {PREVIEW_GLOW_CELLS.map((cell) => <span className={cx(cell === 6 ? "is-lit" : "")} key={cell} />)}
      </span>
    );
  }

  if (gameId === "solitaire") {
    return (
      <span className={cx("game-card-preview is-solitaire")}>
        <span className={cx("preview-solitaire-back")} />
        {PREVIEW_SOLITAIRE_CARDS.map((card) => (
          <span className={cx(`preview-solitaire-card is-${card.color}`)} key={`${card.rank}-${card.suit}`}>
            <b>{card.rank}</b>
            <i>{card.suit}</i>
          </span>
        ))}
      </span>
    );
  }

  if (gameId === "lits") {
    return (
      <span className={cx("game-card-preview is-lits")}>
        {PREVIEW_GRID_CELLS.map((cell) => <span className={cx([1, 2, 5, 9, 10, 14].includes(cell) ? "is-filled" : "")} key={cell} />)}
      </span>
    );
  }

  if (gameId === "shikaku") {
    return (
      <span className={cx("game-card-preview is-shikaku")}>
        <span className={cx("preview-shikaku-area is-a")}>4</span>
        <span className={cx("preview-shikaku-area is-b")}>6</span>
        <span className={cx("preview-shikaku-area is-c")}>6</span>
      </span>
    );
  }

  if (gameId === "minesweeper") {
    return (
      <span className={cx("game-card-preview is-minesweeper")}>
        {PREVIEW_GRID_CELLS.map((cell) => <span key={cell}>{cell === 5 ? "1" : cell === 6 ? "2" : cell === 9 ? "⚑" : ""}</span>)}
      </span>
    );
  }

  if (gameId === "set") {
    return (
      <span className={cx("game-card-preview is-set")}>
        {[0, 1, 2].map((card) => (
          <span className={cx(`preview-set-card is-${card}`)} key={card}>
            {Array.from({ length: card + 1 }, (_, index) => <i key={index} />)}
          </span>
        ))}
      </span>
    );
  }

  if (gameId === "mosaic") {
    return (
      <span className={cx("game-card-preview is-mosaic")}>
        {PREVIEW_GRID_CELLS.map((cell) => <span className={cx([1, 2, 4, 5, 6, 7, 9, 10, 13].includes(cell) ? "is-filled" : "")} key={cell} />)}
      </span>
    );
  }

  if (gameId === "block-blast") {
    return (
      <span className={cx("game-card-preview is-block-blast")}>
        {PREVIEW_GRID_CELLS.map((cell) => <span className={cx([4, 8, 9, 10, 12, 13, 14, 15].includes(cell) ? "is-filled" : "")} key={cell} />)}
      </span>
    );
  }

  return <span className={cx("game-card-preview is-future")} aria-label="준비 중">+</span>;
}
