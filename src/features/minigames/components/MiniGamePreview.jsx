import starFlightCardPreview from "../../../assets/figma/star-flight-card-preview.png";

const PREVIEW_2048_TILES = [2, 4, 8, 16, 0, 32, 64, 0, 0, 128, 256, 0, 0, 0, 512, 1024];
const PREVIEW_SUDOKU_CELLS = [1, "", 5, "", "", 7, "", 3, 4, "", 9, "", "", 2, "", 8];
const PREVIEW_MEMORY_SYMBOLS = ["circle", "diamond", "heart", "star"];
const PREVIEW_GLOW_CELLS = Array.from({ length: 16 }, (_, index) => index);
const PREVIEW_COLOR_TUBES = [
  ["cyan", "orange", "yellow", "green"],
  ["pink", "cyan", "orange", "yellow"],
  ["green", "pink", "cyan", "orange"],
  [],
];

export function MiniGamePreview({ gameId }) {
  if (gameId === "2048") {
    return (
      <span className="game-card-preview is-2048">
        {PREVIEW_2048_TILES.map((value, index) => (
          <span className="preview-2048-tile" data-value={value || undefined} key={index}>{value || ""}</span>
        ))}
      </span>
    );
  }

  if (gameId === "memory") {
    return (
      <span className="game-card-preview is-memory">
        {PREVIEW_MEMORY_SYMBOLS.map((symbol) => <span className={`preview-memory-symbol is-${symbol}`} key={symbol} />)}
      </span>
    );
  }

  if (gameId === "sudoku") {
    return (
      <span className="game-card-preview is-sudoku">
        {PREVIEW_SUDOKU_CELLS.map((value, index) => <span key={index}>{value}</span>)}
      </span>
    );
  }

  if (gameId === "omok") {
    return (
      <span className="game-card-preview is-omok">
        <span className="preview-stone is-black is-one" />
        <span className="preview-stone is-white is-two" />
        <span className="preview-stone is-black is-three" />
        <span className="preview-stone is-white is-four" />
      </span>
    );
  }

  if (gameId === "flappy") {
    return <img className="game-card-preview is-flappy" src={starFlightCardPreview} alt="" />;
  }

  if (gameId === "timing-tap") {
    return (
      <span className="game-card-preview is-timing">
        <span className="preview-target" />
        <span className="preview-needle" />
      </span>
    );
  }

  if (gameId === "glow-sequence") {
    return (
      <span className="game-card-preview is-glow-sequence">
        {PREVIEW_GLOW_CELLS.map((cell) => <span className={cell === 6 ? "is-lit" : ""} key={cell} />)}
      </span>
    );
  }

  if (gameId === "color-sort") {
    return (
      <span className="game-card-preview is-color-sort">
        {PREVIEW_COLOR_TUBES.map((colors, tubeIndex) => (
          <span className="preview-color-tube" key={tubeIndex}>
            {colors.map((color, index) => <span className={`is-${color}`} key={`${color}-${index}`} />)}
          </span>
        ))}
      </span>
    );
  }

  return <span className="game-card-preview is-future" aria-label="준비 중">+</span>;
}
