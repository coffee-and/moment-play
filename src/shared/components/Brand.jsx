import { Link } from "react-router-dom";
import darkLogo from "../../assets/brand/moment-play-logo-dark.webp";
import lightLogo from "../../assets/brand/moment-play-logo-light.webp";
import { useTheme } from "../theme/useTheme.js";
import styles from "./Brand.module.css";

const BRAND_LOGOS = {
  dark: darkLogo,
  light: lightLogo,
};

// Shared logo for the app header, footer, and authentication pages.
export function Brand({ variant }) {
  const { theme } = useTheme();
  const activeVariant = variant ?? theme;
  const safeVariant = BRAND_LOGOS[activeVariant] ? activeVariant : "light";

  return (
    <Link className={styles.root} to="/" aria-label="Moment Play 홈으로" data-variant={safeVariant}>
      <span className={styles.logoStack} aria-hidden="true">
        <img className={`${styles.logo} ${styles.lightTheme}`} src={BRAND_LOGOS.light} alt="" aria-hidden="true" />
        <img className={`${styles.logo} ${styles.darkTheme}`} src={BRAND_LOGOS.dark} alt="" aria-hidden="true" />
      </span>
    </Link>
  );
}
