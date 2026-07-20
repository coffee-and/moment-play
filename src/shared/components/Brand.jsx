import { Link } from "react-router-dom";
import { MoonMark } from "./decoration/CelestialMark.jsx";

// Shared wordmark for the app header and footer.
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Moment Play 홈으로">
      <span className="brand-mark" aria-hidden="true">
        <svg className="brand-icon" viewBox="0 0 40 40">
          <MoonMark />
        </svg>
        <svg className="brand-sparkle" viewBox="0 0 14 14">
          <path d="M7 0c.7 3.5 2.5 5.3 6 6-3.5.7-5.3 2.5-6 6-.7-3.5-2.5-5.3-6-6 3.5-.7 5.3-2.5 6-6Z" fill="currentColor" />
        </svg>
      </span>
      <span className="brand-wordmark"><span>moment</span>{" "}<b>Play</b></span>
    </Link>
  );
}
