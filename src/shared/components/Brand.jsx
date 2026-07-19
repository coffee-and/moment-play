import { Link } from "react-router-dom";
import { MoonMark } from "./decoration/CelestialMark.jsx";

// Shared wordmark for the app header. The yellow crescent is the fixed
// Moment Play mark and does not change with the future color theme.
export function Brand({ className = "" }) {
  return (
    <Link className={`brand ${className}`.trim()} to="/" aria-label="Moment Play 홈으로">
      <svg
        className="brand-icon"
        viewBox="0 0 40 40"
        aria-hidden="true"
      >
        <MoonMark />
      </svg>
      <span>moment <b>PLAY</b></span>
      <svg className="brand-sparkle" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M7 0c.7 3.5 2.5 5.3 6 6-3.5.7-5.3 2.5-6 6-.7-3.5-2.5-5.3-6-6 3.5-.7 5.3-2.5 6-6Z" fill="currentColor" />
      </svg>
    </Link>
  );
}
