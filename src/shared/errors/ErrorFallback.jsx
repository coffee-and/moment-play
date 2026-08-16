import { StatusPanel } from "../components/StatusPanel.jsx";
import styles from "./ErrorFallback.module.css";

const MODE_CLASS = {
  content: styles.content,
  viewport: styles.viewport,
};

function joinClassNames(values) {
  return values.filter(Boolean).join(" ");
}

export function ErrorFallback({
  actions,
  className = "",
  description,
  mode = "content",
  title,
}) {
  return (
    <section
      className={joinClassNames([styles.root, MODE_CLASS[mode], className])}
      role="alert"
      aria-live="assertive"
    >
      <StatusPanel
        type="error"
        className={styles.panel}
        title={title}
        description={description}
        action={actions ? <div className={styles.actions}>{actions}</div> : null}
      />
    </section>
  );
}
