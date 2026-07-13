import { Link, useLocation } from "react-router-dom";
import { isNavItemActive, NAV_ITEMS } from "./navItems.js";

// Desktop header nav — text links only (the mobile equivalent is TabBar).
export function PrimaryNav() {
  const { pathname } = useLocation();

  return (
    <nav className="nav" aria-label="주요 메뉴">
      {NAV_ITEMS.map((item) => (
        <Link key={item.key} className={`lk${isNavItemActive(item, pathname) ? " on" : ""}`} to={item.to}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
