import "../styles/game-item-panel.css";

function joinClassNames(values) {
  return values.filter(Boolean).join(" ");
}

export function GameItemPanel({ ariaLabel, children, className = "", title, variant = "default" }) {
  return (
    <section className={joinClassNames(["game-item-panel", className])} data-variant={variant} aria-label={ariaLabel ?? title}>
      {title ? (
        <div className="game-item-panel__title-row" aria-hidden="true">
          <span className="game-item-panel__title-line" />
          <strong className="game-item-panel__title">{title}</strong>
          <span className="game-item-panel__title-line" />
        </div>
      ) : null}
      <div className="game-item-panel__content">{children}</div>
    </section>
  );
}
