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
  const logo = BRAND_LOGOS[activeVariant] ?? BRAND_LOGOS.light;

  return (
    <Link className="brand" to="/" aria-label="Moment Play 홈으로" data-variant={activeVariant}>
      <img className="brand-logo" src={logo} alt="" aria-hidden="true" />
    </Link>
  );
}
