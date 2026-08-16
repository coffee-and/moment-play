import { forwardRef } from "react";
import styles from "./IconButton.module.css";

function joinClassNames(values) {
  return values.filter(Boolean).join(" ");
}

export const IconButton = forwardRef(function IconButton({
  children,
  className = "",
  label,
  title = label,
  type = "button",
  variant = "header",
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      aria-label={label}
      className={joinClassNames([styles.root, styles[variant], className])}
      data-ui="icon-button"
      title={title}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
});
