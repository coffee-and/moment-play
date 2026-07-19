import { Link } from "react-router-dom";
import { MoonMark } from "./decoration/CelestialMark.jsx";

// Shared wordmark for the app header. The yellow crescent is the fixed
// Moment Play mark and does not change with the future color theme.
export function Brand({ className = "" }) {
  return (
    <Link className={`brand ${className}`.trim()} to="/" aria-label="Moment Play 홈으로">
      <svg
        className="brand-icon"
        viewBox="0 0 32 32"
        aria-hidden="true"
      >
        <MoonMark />
      </svg>
      <span>moment <b>PLAY</b></span>
    </Link>
  );
}
