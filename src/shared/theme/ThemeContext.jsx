import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  applyTheme,
  getInitialTheme,
  isTheme,
  storeTheme,
  THEME,
  THEME_STORAGE_KEY,
} from "./theme.js";

const defaultThemeContext = {
  theme: THEME.LIGHT,
  setTheme: () => {},
  toggleTheme: () => {},
};

export const ThemeContext = createContext(defaultThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  const setTheme = useCallback((nextTheme) => {
    if (!isTheme(nextTheme)) return;
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => (
      currentTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK
    ));
  }, []);

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key === THEME_STORAGE_KEY && isTheme(event.newValue)) {
        setThemeState(event.newValue);
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [setTheme, theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
