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
    return <span className="game-card-preview is-sudoku">{PreviewCells(["8", "", "2", "", "5", "", "1", "", "9"])}</span>;
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

  if (gameId === "snake") {
    return (
      <span className="game-card-preview is-snake">
        <span /><span /><span /><span /><i />
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
