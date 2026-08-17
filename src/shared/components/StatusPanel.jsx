import styles from "./StatusPanel.module.css";

function joinClassNames(values) {
  return values.filter(Boolean).join(" ");
}

export function StatusPanel({ title, description, action, className = "" }) {
  return (
    <div className={joinClassNames(["card", styles.root, className])}>
      <strong className={styles.title}>{title}</strong>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
