import { Link } from "react-router-dom";
import darkLogo from "../../assets/brand/moment-play-logo-dark.webp";
import lightLogo from "../../assets/brand/moment-play-logo-light.webp";
import { useTheme } from "../theme/useTheme.js";

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
    <Link className="brand" to="/" aria-label="Moment Play 홈으로" data-variant={safeVariant}>
      <span className="brand-logo-stack" aria-hidden="true">
        <img className="brand-logo brand-logo--light-theme" src={BRAND_LOGOS.light} alt="" aria-hidden="true" />
        <img className="brand-logo brand-logo--dark-theme" src={BRAND_LOGOS.dark} alt="" aria-hidden="true" />
      </span>
    </Link>
  );
}
