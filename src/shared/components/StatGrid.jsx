// Reuses the existing .stat-row/.stat markup already used by each game's own sidebar,
// so the detail section's records look consistent without duplicating that CSS.
export function StatGrid({ children }) {
  return <div className="stat-row">{children}</div>;
}

export function StatItem({ label, value }) {
  return (
    <div className="stat">
      <div className="l">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}
