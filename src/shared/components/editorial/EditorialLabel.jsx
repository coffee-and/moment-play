export function EditorialLabel({ children, variant = "section" }) {
  return <span className={`editorial-label editorial-label--${variant}`}>{children}</span>;
}
