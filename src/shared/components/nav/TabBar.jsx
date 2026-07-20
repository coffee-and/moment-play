import { Link, useLocation } from "react-router-dom";
import { useInviteNotifications } from "../../invitations/InviteNotificationContext.jsx";
import { NavNotificationBadge } from "./NavNotificationBadge.jsx";
import { isNavItemActive, NAV_ITEMS } from "./navItems.js";

function getNavItemAriaLabel(item, pendingCount) {
  if (item.key !== "friends" || pendingCount <= 0) return item.accessibleLabel;
  return `${item.accessibleLabel}, 받은 오목 초대 ${pendingCount}개`;
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
    </nav>
  );
}
