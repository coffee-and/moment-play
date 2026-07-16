import { Link, useLocation } from "react-router-dom";
import { useInviteNotifications } from "../../invitations/InviteNotificationContext.jsx";
import { NavNotificationBadge } from "./NavNotificationBadge.jsx";
import { isNavItemActive, NAV_ITEMS } from "./navItems.js";

function getNavItemAriaLabel(item, pendingCount) {
  if (item.key !== "friends" || pendingCount <= 0) return item.label;
  return `${item.label}, 받은 오목 초대 ${pendingCount}개`;
}

// Desktop header nav — text links only (the mobile equivalent is TabBar).
export function PrimaryNav() {
  const { pathname } = useLocation();
  const { pendingCount } = useInviteNotifications();

  return (
    <nav className="nav" aria-label="주요 메뉴">
      {NAV_ITEMS.map((item) => {
        const notificationCount = item.key === "friends" ? pendingCount : 0;
        return (
          <Link
            key={item.key}
            className={`lk${isNavItemActive(item, pathname) ? " on" : ""}`}
            to={item.to}
            aria-label={getNavItemAriaLabel(item, notificationCount)}
          >
            <span>{item.label}</span>
            <NavNotificationBadge count={notificationCount} />
          </Link>
        );
      })}
    </nav>
  );
}
