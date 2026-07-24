export function LoadingIndicator({ label = "불러오는 중" }) {
  return (
    <span className="loading-indicator" role="status">
      <span className="loading-indicator__bars" aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      <span>{label}</span>
    </span>
  );
}
