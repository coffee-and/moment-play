import { FriendsIcon, GamesIcon, HomeIcon, RankingIcon, SettingsIcon } from "./navIcons.jsx";
import { RANKING_PATH } from "../../../features/ranking/rankingConstants.js";

// Single source of truth for the app's primary destinations, consumed by both
// the desktop header nav and the mobile bottom tab bar.
export const NAV_ITEMS = [
  { key: "home", label: "홈", to: "/", icon: HomeIcon },
  { key: "games", label: "게임", to: "/#games", icon: GamesIcon },
  { key: "ranking", label: "랭킹", to: RANKING_PATH, icon: RankingIcon },
  { key: "friends", label: "친구", to: "/friends", icon: FriendsIcon },
  { key: "settings", label: "설정", to: "/settings", icon: SettingsIcon },
];

export function isNavItemActive(item, pathname) {
  if (item.key === "home") return pathname === "/";
  // "games" shares the home route (scrolls to its section) - never shown as its own active state.
  if (item.key === "games") return false;
  return pathname.startsWith(item.to);
}
