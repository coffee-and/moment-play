import { useTheme } from "../../theme/ThemeContext.jsx";
import { MoonIcon, SunIcon } from "./navIcons.jsx";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button className="toggle" type="button" role="switch" aria-checked={theme === "dark"} aria-label="밤/낮 전환" onClick={toggleTheme}>
      <span className="knob" aria-hidden="true" />
      <span className="ic t-sun" aria-hidden="true"><SunIcon /></span>
      <span className="ic t-moon" aria-hidden="true"><MoonIcon /></span>
    </button>
  );
}
