import { Link } from "react-router-dom";
import { useTheme } from "../theme/ThemeContext.jsx";
import { MoonMark, SunMark } from "./decoration/CelestialMark.jsx";

// Shared wordmark, used by the app header and the home page footer.
// The mark itself swaps for the active theme: a warm sun by day, a
// crescent moon by night - both kept at full opacity for contrast. Shape
// shared with the modal's sky decoration (see CelestialMark.jsx).
export function Brand({ className = "" }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Link className={`brand ${className}`.trim()} to="/" aria-label="Moment Play 홈으로">
      <svg
        className="brand-icon"
        viewBox="0 0 32 32"
        role="img"
        aria-label={isDark ? "밤 테마 로고 아이콘: 초승달" : "낮 테마 로고 아이콘: 해"}
        style={{ color: isDark ? "var(--decoration-moon)" : "var(--decoration-sun)" }}
      >
        {isDark ? <MoonMark /> : <SunMark />}
      </svg>
      moment<b>PLAY</b>
    </Link>
  );
}
