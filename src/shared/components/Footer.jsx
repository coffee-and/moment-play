import { Brand } from "./Brand.jsx";
import styles from "./Footer.module.css";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.root}>
      <div className="wrap">
        <div className={styles.content}>
          <div className={styles.identity}>
            <Brand />
            <div className={styles.copyright}>© {currentYear} moment Play · 짧은 순간을 위한 미니게임.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
