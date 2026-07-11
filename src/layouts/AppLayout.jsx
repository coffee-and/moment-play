import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

export function AppLayout() {
  const [theme, setTheme] = useState("dark");
  const location = useLocation();
  const isHome = location.pathname === "/";

  // react-router's plain <Routes> (non-data router) doesn't restore scroll on navigation.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className={`moment-app pal-${theme}`}>
      <div className="wrap">
        <header className="card nav reveal">
          <Link className="brand" to="/" aria-label="Moment Play home">
            <span className="bd" aria-hidden="true" />moment<b>PLAY</b>
          </Link>
          {isHome ? (
            <nav className="nav-links" aria-label="Moment Play navigation">
              <a className="nav-link on" href="#games">Games</a>
              <a className="nav-link" href="#featured">Featured</a>
              <a className="nav-link" href="#about">About</a>
            </nav>
          ) : null}
          <button
            className="mode-btn"
            type="button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </header>
      </div>
      <Outlet />
    </div>
  );
}
