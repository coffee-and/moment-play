import "./sky-decoration.css";

// Purely decorative day/night backdrop, rendered once behind all app content
// (see AppLayout.jsx). Kept in its own component + stylesheet so it can be
// swapped, disabled, or replaced independently of page layout (CLAUDE.md 5.3).
// Both the cloud and star layers are always in the DOM; CSS toggles which one
// is visible for the active [data-theme], so switching themes never remounts
// or reflows this layer.

const CLOUDS = [
  { top: "8%", left: "62%", width: 150, scale: 1 },
  { top: "16%", left: "8%", width: 110, scale: 0.85 },
  { top: "30%", left: "82%", width: 90, scale: 0.7 },
  { top: "58%", left: "18%", width: 130, scale: 0.9 },
  { top: "72%", left: "70%", width: 100, scale: 0.75 },
];

// 4-point sparkle stars: position/size/opacity vary slightly per star.
const SPARKLE_STARS = [
  { top: "10%", left: "16%", size: 20, opacity: 0.85, delay: "0s" },
  { top: "18%", left: "78%", size: 14, opacity: 0.7, delay: "0.6s" },
  { top: "34%", left: "48%", size: 12, opacity: 0.55, delay: "1.1s" },
  { top: "52%", left: "88%", size: 16, opacity: 0.75, delay: "0.3s" },
  { top: "68%", left: "10%", size: 13, opacity: 0.6, delay: "0.9s" },
];

// Small circular dot stars, layered in alongside the sparkles.
const DOT_STARS = [
  { top: "6%", left: "40%", size: 3, opacity: 0.6 },
  { top: "14%", left: "58%", size: 2, opacity: 0.45 },
  { top: "24%", left: "24%", size: 3, opacity: 0.7 },
  { top: "40%", left: "70%", size: 2, opacity: 0.5 },
  { top: "60%", left: "42%", size: 3, opacity: 0.55 },
  { top: "78%", left: "84%", size: 2, opacity: 0.4 },
  { top: "84%", left: "30%", size: 3, opacity: 0.6 },
];

function Cloud({ top, left, width, scale }) {
  return (
    <span
      className="sky-decoration__cloud"
      style={{ top, left, width, transform: `scale(${scale})` }}
    />
  );
}

function SparkleStar({ top, left, size, opacity, delay }) {
  return (
    <svg
      className="sky-decoration__star sky-decoration__star--sparkle"
      style={{ top, left, width: size, height: size, opacity, animationDelay: delay }}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 1.5c.9 5.8 3.4 8.3 9 9-5.6.7-8.1 3.2-9 9-.9-5.8-3.4-8.3-9-9 5.6-.7 8.1-3.2 9-9Z" />
    </svg>
  );
}

function DotStar({ top, left, size, opacity }) {
  return (
    <span
      className="sky-decoration__star sky-decoration__star--dot"
      style={{ top, left, width: size, height: size, opacity }}
    />
  );
}

export function SkyDecoration() {
  return (
    <div className="sky-decoration" aria-hidden="true">
      <div className="sky-decoration__clouds">
        {CLOUDS.map((cloud, index) => <Cloud key={index} {...cloud} />)}
      </div>
      <div className="sky-decoration__stars">
        {SPARKLE_STARS.map((star, index) => <SparkleStar key={`sparkle-${index}`} {...star} />)}
        {DOT_STARS.map((star, index) => <DotStar key={`dot-${index}`} {...star} />)}
      </div>
    </div>
  );
}
