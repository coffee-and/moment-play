// Shared nav icon set (desktop header uses text-only links; the mobile tab bar
// pairs each destination with one of these). Path data mirrors the icon set in
// moment_play_design/momentplay-home.html so the two stay visually consistent.

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5" />
    </svg>
  );
}

export function GamesIcon() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-4 1.5L9.5 15l4-1.5L15 9Z" />
    </svg>
  );
}

export function RankingIcon() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <path d="M6 20V10M12 20V4M18 20v-6" />
    </svg>
  );
}

export function FriendsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 5.6M20.5 20a5.5 5.5 0 0 0-4-5.3" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 15M20 12h.1M4 12h.1" />
    </svg>
  );
}
