function PreviewCells(values) {
  return values.map((value, index) => <span key={`${value}-${index}`}>{value}</span>);
}

export function MiniGamePreview({ gameId }) {
  if (gameId === "2048") {
    return <span className="game-card-preview is-2048">{PreviewCells(["2", "4", "8", "16"])}</span>;
  }

  if (gameId === "memory") {
    return <span className="game-card-preview is-memory">{PreviewCells(["★", "♥", "✿"])}</span>;
  }

  if (gameId === "sudoku") {
    return <span className="game-card-preview is-sudoku">{PreviewCells(["1", "5", "9"])}</span>;
  }

  if (gameId === "omok") {
    return (
      <span className="game-card-preview is-omok">
        <span className="preview-stone is-black" />
        <span className="preview-stone is-white" />
        <span className="preview-stone is-accent" />
      </span>
    );
  }

  if (gameId === "flappy") {
    return (
      <span className="game-card-preview is-flappy">
        <span className="preview-flappy-gate is-left" />
        <span className="preview-flappy-bird"><i /></span>
        <span className="preview-flappy-gate is-right" />
      </span>
    );
  }

  if (gameId === "timing-tap") {
    return (
      <span className="game-card-preview is-timing">
        <span className="preview-target" />
        <span className="preview-needle" />
      </span>
    );
  }

  return <span className="game-card-preview is-future" aria-label="준비 중">+</span>;
}
