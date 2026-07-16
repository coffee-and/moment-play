import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { AUTH_LABELS, getAccountLabel, LOGIN_PATH } from "../../auth/authConstants.js";
import { useInviteNotifications } from "../../invitations/InviteNotificationContext.jsx";
import { AccountIcon } from "./navIcons.jsx";
import { NavNotificationBadge } from "./NavNotificationBadge.jsx";
import { isNavItemActive, NAV_ITEMS } from "./navItems.js";

function getNavItemAriaLabel(item, pendingCount) {
  if (item.key !== "friends" || pendingCount <= 0) return item.label;
  return `${item.label}, 받은 오목 초대 ${pendingCount}개`;
}

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
  const { pendingCount } = useInviteNotifications();

  return (
    <nav className="tabbar" aria-label="하단 탭">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const notificationCount = item.key === "friends" ? pendingCount : 0;
        return (
          <Link
            key={item.key}
            className={isNavItemActive(item, pathname) ? "on" : undefined}
            to={item.to}
            aria-label={getNavItemAriaLabel(item, notificationCount)}
          >
            <span className="tabbar__icon">
              <Icon />
              <NavNotificationBadge count={notificationCount} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
      <AccountTab pathname={pathname} />
    </nav>
  );
}
