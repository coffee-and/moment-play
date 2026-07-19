import { FriendsIcon, GamesIcon, HomeIcon, RankingIcon, SettingsIcon } from "./navIcons.jsx";
import { FRIENDS_PATH } from "../../../features/friends/friendsConstants.js";
import { RANKING_PATH } from "../../../features/ranking/rankingConstants.js";
import { SETTINGS_PATH } from "../../../features/settings/settingsConstants.js";
import { MINIGAMES_PATH } from "../../../features/minigames/data/minigameCatalog.js";

// Single source of truth for the app's primary destinations, consumed by both
// the desktop header nav and the mobile bottom tab bar.
export const NAV_ITEMS = [
  { key: "home", label: "홈", to: "/", icon: HomeIcon },
  { key: "games", label: "게임", to: MINIGAMES_PATH, icon: GamesIcon },
  { key: "ranking", label: "랭킹", to: RANKING_PATH, icon: RankingIcon },
  { key: "friends", label: "친구", to: FRIENDS_PATH, icon: FriendsIcon },
  { key: "settings", label: "설정", to: SETTINGS_PATH, icon: SettingsIcon },
];

export function isNavItemActive(item, pathname) {
  if (item.key === "home") return pathname === "/";
  return pathname.startsWith(item.to);
}
