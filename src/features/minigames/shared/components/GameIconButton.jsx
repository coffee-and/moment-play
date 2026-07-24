export function GameIconButton({
  children,
  className = "",
  label,
  title = label,
  ...props
}) {
  return (
    <button
      aria-label={label}
      className={`header-icon-button game-stage__icon-button${className ? ` ${className}` : ""}`}
      title={title}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
