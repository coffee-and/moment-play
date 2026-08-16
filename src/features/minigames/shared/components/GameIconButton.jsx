import { IconButton } from "../../../../shared/components/IconButton.jsx";

export function GameIconButton({
  children,
  className = "",
  label,
  title = label,
  ...props
}) {
  return (
    <IconButton
      className={className}
      label={label}
      title={title}
      variant="stage"
      {...props}
    >
      {children}
    </IconButton>
  );
}
