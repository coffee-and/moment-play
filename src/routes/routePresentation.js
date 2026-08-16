const MINIGAME_PLAY_PATH_PATTERN = /^\/minigames\/[^/]+(?:\/room\/[^/]+)?\/?$/;

export function isImmersiveRoute(pathname) {
  return MINIGAME_PLAY_PATH_PATTERN.test(pathname);
}
