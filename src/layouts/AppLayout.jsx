import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../shared/auth/AuthContext.jsx";
import { AUTH_LABELS, getAccountLabel, LOGIN_PATH } from "../shared/auth/authConstants.js";
import { Brand } from "../shared/components/Brand.jsx";
import { SkyDecoration } from "../shared/components/decoration/SkyDecoration.jsx";
import { PrimaryNav } from "../shared/components/nav/PrimaryNav.jsx";
import { TabBar } from "../shared/components/nav/TabBar.jsx";
import { ThemeToggle } from "../shared/components/nav/ThemeToggle.jsx";

const OMOK_ROOM_PATH_PATTERN = /^\/minigames\/omok\/room\/[^/]+\/?$/;

function AccountControl() {
  const { signOut, status, user } = useAuth();

  if (status === "loading") {
    return <span className="account-control account-control--loading" aria-label={AUTH_LABELS.loading} />;
  }

  if (status === "authenticated") {
    return (
      <details className="account-menu">
        <summary className="account-control">{getAccountLabel(user)}</summary>
        <div className="account-menu__panel">
          <button type="button" onClick={() => void signOut()}>{AUTH_LABELS.logout}</button>
        </div>
      </details>
    );
  }

  return <Link className="account-control" to={LOGIN_PATH}>{AUTH_LABELS.login}</Link>;
}

export function AppLayout() {
  const location = useLocation();
  const isImmersiveRoom = OMOK_ROOM_PATH_PATTERN.test(location.pathname);

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
    <div className={`moment-app${isImmersiveRoom ? " moment-app--immersive" : ""}`}>
      <SkyDecoration />
      {!isImmersiveRoom ? (
        <header className="hd">
          <div className="wrap hd-in">
            <Brand />
            <PrimaryNav />
            <div className="hd-right">
              <ThemeToggle />
              <AccountControl />
            </div>
          </div>
        </header>
      ) : null}
      <main className={isImmersiveRoom ? "app-main--immersive" : undefined}>
        <Outlet />
      </main>
      {!isImmersiveRoom ? <TabBar /> : null}
    </div>
  );
}
