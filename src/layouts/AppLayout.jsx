import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../shared/auth/AuthContext.jsx";
import { AUTH_LABELS, getAccountLabel, LOGIN_PATH } from "../shared/auth/authConstants.js";
import { Brand } from "../shared/components/Brand.jsx";
import { Footer } from "../shared/components/Footer.jsx";
import { PrimaryNav } from "../shared/components/nav/PrimaryNav.jsx";
import { TabBar } from "../shared/components/nav/TabBar.jsx";
import { SoundToggle } from "../shared/audio/SoundToggle.jsx";
import { SoundUnlockHint } from "../shared/audio/SoundUnlockHint.jsx";

const MINIGAME_PLAY_PATH_PATTERN = /^\/minigames\/[^/]+(?:\/room\/[^/]+)?\/?$/;

function AccountControl() {
  const { signOut, status, user } = useAuth();

  if (status === "loading") {
    return <span className="account-control account-control--loading" aria-label={AUTH_LABELS.loading} />;
  }

  if (status === "authenticated") {
    return (
      <details className="account-menu">
        <summary className="account-control"><span className="account-control__label">{getAccountLabel(user)}</span></summary>
        <div className="account-menu__panel">
          <button type="button" onClick={() => void signOut()}>{AUTH_LABELS.logout}</button>
        </div>
      </details>
    );
  }

  return <Link className="account-control" to={LOGIN_PATH}><span className="account-control__label">{AUTH_LABELS.login}</span></Link>;
}

export function AppLayout() {
  const location = useLocation();
  const isImmersiveGame = MINIGAME_PLAY_PATH_PATTERN.test(location.pathname);

  // react-router's plain <Routes> (non-data router) doesn't restore scroll on
  // navigation. Scroll to an in-page section when a route carries a hash;
  // otherwise reset to the top of the new screen.
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

  // Every playable game route owns its own exit or return action. Hiding the
  // global chrome prevents Home, Settings, Ranking, or Friends navigation from
  // competing with an active attempt. Room routes also preserve their required
  // leave confirmation and server cleanup flow.
  return (
    <div className={`moment-app${isImmersiveGame ? " moment-app--immersive" : ""}`}>
      {!isImmersiveGame ? (
        <header className="hd">
          <div className="wrap hd-in">
            <Brand />
            <PrimaryNav />
            <div className="hd-right">
              <SoundToggle />
              <AccountControl />
            </div>
          </div>
        </header>
      ) : null}
      {!isImmersiveGame ? <SoundUnlockHint /> : null}
      <main className={isImmersiveGame ? "app-main--immersive" : undefined}>
        <Outlet />
      </main>
      {!isImmersiveGame ? <Footer /> : null}
      {!isImmersiveGame ? <TabBar /> : null}
    </div>
  );
}
