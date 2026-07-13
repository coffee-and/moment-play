import { Link } from "react-router-dom";
import { useTheme } from "../theme/ThemeContext.jsx";

function SunMark() {
  return (
    <>
      <circle cx="16" cy="16" r="7" fill="#ffb300" />
      <g stroke="#ffb300" strokeWidth="2.4" strokeLinecap="round">
        <path d="M16 3v3M16 26v3M3 16h3M26 16h3M6.5 6.5l2.1 2.1M23.4 23.4l2.1 2.1M25.5 6.5l-2.1 2.1M8.6 23.4l-2.1 2.1" />
      </g>
    </>
  );
}

function MoonMark() {
  return <path d="M23.5 19.2A9.5 9.5 0 1 1 12.8 4a7.5 7.5 0 0 0 10.7 15.2Z" fill="#eef1fb" />;
}

// Shared wordmark, used by the app header and the home page footer.
// The mark itself swaps for the active theme: a warm sun by day, a
// crescent moon by night - both kept at full opacity for contrast.
export function Brand({ className = "" }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Link className={`brand ${className}`.trim()} to="/" aria-label="Moment Play 홈으로">
      <svg className="brand-icon" viewBox="0 0 32 32" role="img" aria-label={isDark ? "밤 테마 로고 아이콘: 초승달" : "낮 테마 로고 아이콘: 해"}>
        {isDark ? <MoonMark /> : <SunMark />}
      </svg>
      moment<b>PLAY</b>
    </Link>
  );
}
