import starFlightCardPreview from "../../../assets/figma/star-flight-card-preview.png";

const PREVIEW_2048_TILES = [2, 4, 8, 16, 0, 32, 64, 0, 0, 128, 256, 0, 0, 0, 512, 1024];
const PREVIEW_SUDOKU_CELLS = [1, "", 5, "", "", 7, "", 3, 4, "", 9, "", "", 2, "", 8];
const PREVIEW_MEMORY_SYMBOLS = ["circle", "diamond", "heart", "star"];
const PREVIEW_GLOW_CELLS = Array.from({ length: 16 }, (_, index) => index);
const PREVIEW_TRACE_POINTS = [[14, 66], [36, 26], [58, 68], [78, 34], [88, 72]];
const PREVIEW_NONOGRAM = [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1];

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

  if (gameId === "star-trace") {
    return (
      <span className="game-card-preview is-star-trace">
        <svg viewBox="0 0 100 100" aria-hidden="true"><polyline points={PREVIEW_TRACE_POINTS.map((point) => point.join(",")).join(" ")} /></svg>
        {PREVIEW_TRACE_POINTS.map(([x, y], index) => <span key={index} style={{ left: `${x}%`, top: `${y}%` }} />)}
      </span>
    );
  }

  if (gameId === "moon-mirror") {
    return <span className="game-card-preview is-moon-mirror">{Array.from({ length: 16 }, (_, index) => <span className={[1, 4, 5, 8, 2, 7, 10, 11].includes(index) ? "is-filled" : ""} key={index} />)}</span>;
  }

  if (gameId === "nonogram") {
    return <span className="game-card-preview is-nonogram">{PREVIEW_NONOGRAM.map((filled, index) => <span className={filled ? "is-filled" : ""} key={index} />)}</span>;
  }

  return <span className="game-card-preview is-future" aria-label="준비 중">+</span>;
}
