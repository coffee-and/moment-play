import { useTheme } from "./useTheme.js";
import { THEME } from "./theme.js";

function ThemeIcon({ theme }) {
  if (theme === THEME.DARK) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20.2 15.1A8.4 8.4 0 0 1 8.9 3.8 8.4 8.4 0 1 0 20.2 15.1Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === THEME.DARK;
  const label = isDark ? "라이트 테마로 전환" : "다크 테마로 전환";

  return (
    <button
      className={`header-icon-button theme-toggle${isDark ? " is-active" : ""}`}
      type="button"
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      onClick={toggleTheme}
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}
