// Shared sun/moon glyphs - reused by the header Brand logo and the modal's
// day/night sky decoration, so the same recognizable shapes appear in both
// places instead of two separate implementations drifting apart. Both use
// currentColor; the consumer sets `color` on a wrapping element (see
// Brand.jsx and GameStageOverlay.jsx) to the appropriate decoration token.
export function SunMark() {
  return (
    <>
      <circle cx="16" cy="16" r="7" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M16 3v3M16 26v3M3 16h3M26 16h3M6.5 6.5l2.1 2.1M23.4 23.4l2.1 2.1M25.5 6.5l-2.1 2.1M8.6 23.4l-2.1 2.1" />
      </g>
    </>
  );
}

export function MoonMark() {
  return <path d="M23.5 19.2A9.5 9.5 0 1 1 12.8 4a7.5 7.5 0 0 0 10.7 15.2Z" fill="currentColor" />;
}
