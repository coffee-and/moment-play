import { Link } from "react-router-dom";

// Shared wordmark, used by the app header and the home page footer.
export function Brand({ className = "" }) {
  return (
    <Link className={`brand ${className}`.trim()} to="/" aria-label="Moment Play 홈으로">
      <svg className="brand-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="7" fill="#ffce4d" />
        <g stroke="#ffce4d" strokeWidth="2.4" strokeLinecap="round">
          <path d="M16 3v3M16 26v3M3 16h3M26 16h3M6.5 6.5l2.1 2.1M23.4 23.4l2.1 2.1M25.5 6.5l-2.1 2.1M8.6 23.4l-2.1 2.1" />
        </g>
      </svg>
      moment<b>PLAY</b>
    </Link>
  );
}
