function joinClassNames(values) {
  return values.filter(Boolean).join(' ');
}

export function GameStageOverlay({ children, className = '', state, ...props }) {
  return (
    <div className={joinClassNames(['game-stage-overlay', className])} data-state={state} {...props}>
      {children}
    </div>
  );
}

export function GameStageModal({ children, className = '', style, ...props }) {
  return (
    <div className={joinClassNames(['game-stage-modal', className])} style={{ ...style }} {...props}>
      {children}
    </div>
  );
}
