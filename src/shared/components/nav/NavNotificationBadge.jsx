import "./nav-notifications.css";

export function formatNotificationCount(count) {
  const normalized = Math.max(0, Number(count) || 0);
  return normalized > 99 ? "99+" : String(normalized);
}

export function NavNotificationBadge({ count }) {
  if (!count) return null;
  return (
    <span className="nav-notification-badge" aria-hidden="true">
      {formatNotificationCount(count)}
    </span>
  );
}
