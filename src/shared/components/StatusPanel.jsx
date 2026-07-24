function joinClassNames(values) {
  return values.filter(Boolean).join(" ");
}

const TYPE_CLASS = {
  empty: "status-panel--empty",
  comingSoon: "status-panel--coming-soon",
  notFound: "status-panel--not-found",
  error: "status-panel--error",
};

export function StatusPanel({ type = "empty", title, description, action, className = "" }) {
  return (
    <div className={joinClassNames(["card", "status-panel", TYPE_CLASS[type], className])}>
      <strong className="status-panel__title">{title}</strong>
      {description ? <p className="status-panel__description">{description}</p> : null}
      {action ? <div className="status-panel__action">{action}</div> : null}
    </div>
  );
}
