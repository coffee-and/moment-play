import { Link } from "react-router-dom";
import darkLogo from "../../assets/brand/moment-play-logo-dark.webp";
import lightLogo from "../../assets/brand/moment-play-logo-light.webp";

const BRAND_LOGOS = {
  dark: darkLogo,
  light: lightLogo,
};

// Shared logo for the app header, footer, and authentication pages.
export function Brand({ variant = "light" }) {
  const logo = BRAND_LOGOS[variant] ?? BRAND_LOGOS.light;

  return (
    <Link className="brand" to="/" aria-label="Moment Play 홈으로" data-variant={variant}>
      <img className="brand-logo" src={logo} alt="" aria-hidden="true" />
    </Link>
  );
}
