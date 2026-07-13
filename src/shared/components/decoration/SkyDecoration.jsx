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

// Sparkle star sizes read from the shared --star-size-* tokens (styles.css)
// so SkyDecoration and the modal's sky decoration stay in sync from one
// place. A small mix of levels keeps the night sky varied without looking
// noisy: a couple of larger "anchor" stars, one medium, a couple small.
const SPARKLE_SIZE = { sm: "var(--star-size-sm)", md: "var(--star-size-md)", lg: "var(--star-size-lg)" };
const DOT_SIZE = { sm: "var(--dot-size-sm)", md: "var(--dot-size-md)", lg: "var(--dot-size-lg)" };

// 4-point sparkle stars: position/level/opacity vary per star.
const SPARKLE_STARS = [
  { top: "10%", left: "16%", level: "lg", opacity: 0.92, delay: "0s" },
  { top: "18%", left: "78%", level: "md", opacity: 0.78, delay: "0.6s" },
  { top: "34%", left: "48%", level: "sm", opacity: 0.6, delay: "1.1s" },
  { top: "52%", left: "88%", level: "lg", opacity: 0.85, delay: "0.3s" },
  { top: "68%", left: "10%", level: "sm", opacity: 0.65, delay: "0.9s" },
];

// Circular dot stars, layered in alongside the sparkles. Fewer, larger dots
// than before - a handful of barely-visible pinpricks read as noise rather
// than stars.
const DOT_STARS = [
  { top: "6%", left: "40%", level: "md", opacity: 0.7 },
  { top: "14%", left: "58%", level: "sm", opacity: 0.55 },
  { top: "24%", left: "24%", level: "lg", opacity: 0.8 },
  { top: "60%", left: "42%", level: "sm", opacity: 0.6 },
  { top: "84%", left: "30%", level: "md", opacity: 0.65 },
];

function Cloud({ top, left, width, scale }) {
  return (
    <span
      className="sky-decoration__cloud"
      style={{ top, left, width, transform: `scale(${scale})` }}
    />
  );
}

function SparkleStar({ top, left, level, opacity, delay }) {
  const size = SPARKLE_SIZE[level];
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

function DotStar({ top, left, level, opacity }) {
  const size = DOT_SIZE[level];
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
