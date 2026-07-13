import { Link, useLocation } from "react-router-dom";
import { isNavItemActive, NAV_ITEMS } from "./navItems.js";

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
    </nav>
  );
}
