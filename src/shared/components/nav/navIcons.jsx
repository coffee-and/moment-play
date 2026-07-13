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

export function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1 1M17.4 17.4l1 1M18.4 5.6l-1 1M6.6 17.4l-1 1" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
