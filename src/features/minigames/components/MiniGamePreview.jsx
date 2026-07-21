import memoryCardPreview from "../../../assets/figma/memory-card-preview.png";
import starFlightCardPreview from "../../../assets/figma/star-flight-card-preview.png";

function PreviewCells(values) {
  return values.map((value, index) => <span key={`${value}-${index}`}>{value}</span>);
}

export function MiniGamePreview({ gameId }) {
  if (gameId === "2048") {
    return <span className="game-card-preview is-2048">{PreviewCells(["2", "4", "16"])}</span>;
  }

  if (gameId === "memory") {
    return <img className="game-card-preview is-memory" src={memoryCardPreview} alt="" />;
  }

  if (gameId === "sudoku") {
    return <span className="game-card-preview is-sudoku">{PreviewCells(["1", "5", "9"])}</span>;
  }

  if (gameId === "omok") {
    return (
      <span className="game-card-preview is-omok">
        <span className="preview-stone is-black" />
        <span className="preview-stone is-white" />
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
        {PreviewCells(["", "", "", "", "", ""])}
      </span>
    );
  }

  if (gameId === "color-sort") {
    return (
      <span className="game-card-preview is-color-sort">
        {PreviewCells(["", "", "", "", "", ""])}
      </span>
    );
  }

  return <span className="game-card-preview is-future" aria-label="준비 중">+</span>;
}
