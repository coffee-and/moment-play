import styles from "./LoadingIndicator.module.css";

export function LoadingIndicator({ label = "불러오는 중" }) {
  return (
    <span className={styles.root} role="status">
      <span className={styles.bars} aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      <span>{label}</span>
    </span>
  );
}
