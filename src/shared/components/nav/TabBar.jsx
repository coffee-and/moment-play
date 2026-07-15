import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { AUTH_LABELS, getAccountLabel, LOGIN_PATH } from "../../auth/authConstants.js";
import { AccountIcon } from "./navIcons.jsx";
import { isNavItemActive, NAV_ITEMS } from "./navItems.js";

// Mobile equivalent of the header's AccountControl (see AppLayout.jsx) - same
// AuthContext, same status derivation, so the two surfaces never disagree.
function AccountTab({ pathname }) {
  const { signOut, status, user } = useAuth();

  if (status === "loading") {
    return (
      <span className="tabbar-account" aria-label={AUTH_LABELS.loading}>
        <AccountIcon />
      </span>
    );
  }

  if (status === "authenticated") {
    return (
      <details className="account-menu tabbar-account-menu">
        <summary>
          <AccountIcon />
          {getAccountLabel(user)}
        </summary>
        <div className="account-menu__panel">
          <button type="button" onClick={() => void signOut()}>{AUTH_LABELS.logout}</button>
        </div>
      </details>
    );
  }

  return (
    <Link className={pathname.startsWith(LOGIN_PATH) ? "on" : undefined} to={LOGIN_PATH}>
      <AccountIcon />
      {AUTH_LABELS.login}
    </Link>
  );
}

// Mobile bottom tab bar (hidden above 560px via .tabbar's own media query).
export function TabBar() {
  const { pathname } = useLocation();

  return (
    <nav className="tabbar" aria-label="하단 탭">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.key} className={isNavItemActive(item, pathname) ? "on" : undefined} to={item.to}>
            <Icon />
            {item.label}
          </Link>
        );
      })}
      <AccountTab pathname={pathname} />
    </nav>
  );
}
