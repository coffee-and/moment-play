import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Brand } from "../shared/components/Brand.jsx";
import { SkyDecoration } from "../shared/components/decoration/SkyDecoration.jsx";
import { PrimaryNav } from "../shared/components/nav/PrimaryNav.jsx";
import { TabBar } from "../shared/components/nav/TabBar.jsx";
import { ThemeToggle } from "../shared/components/nav/ThemeToggle.jsx";

export function AppLayout() {
  const location = useLocation();

  // react-router's plain <Routes> (non-data router) doesn't restore scroll on
  // navigation. Scroll to an in-page section when the URL carries a hash
  // (e.g. the "게임" nav item linking to "/#games"), otherwise reset to top.
  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        target.scrollIntoView({ block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <div className="moment-app">
      <SkyDecoration />
      <header className="hd">
        <div className="wrap hd-in">
          <Brand />
          <PrimaryNav />
          <div className="hd-right">
            <ThemeToggle />
            <Link className="avatar" to="/login" aria-label="프로필">🙂</Link>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
