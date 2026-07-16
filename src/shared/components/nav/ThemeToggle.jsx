import { useTheme } from "../../theme/ThemeContext.jsx";
import { MoonIcon, SunIcon } from "./navIcons.jsx";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = nextTheme === "light" ? "라이트 모드로 전환" : "다크 모드로 전환";

  return (
    <button
      className={`header-icon-button theme-toggle is-${nextTheme}-target`}
      type="button"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      {nextTheme === "light" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
