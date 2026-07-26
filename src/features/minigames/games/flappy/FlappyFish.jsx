import "./flappy-fish-svg.css";

export function FlappyFish({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`flappy-fish-svg ${className}`.trim()}
    >
      <svg
        className="flappy-fish-svg__tail"
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 160 160"
      >
        <path
          d="M54 134A27 27 0 0 1 54 80A27 27 0 0 1 54 26Q96 26 138 80Q96 134 54 134Z"
          fill="var(--fish-tail-color)"
          stroke="var(--fish-outline-color)"
          strokeLinejoin="round"
          strokeWidth="8"
        />
      </svg>

      <svg className="flappy-fish-svg__body" focusable="false" viewBox="0 0 430 220">
        <ellipse
          cx="215"
          cy="110"
          fill="var(--fish-body-color)"
          rx="196"
          ry="92"
          stroke="var(--fish-outline-color)"
          strokeWidth="8"
        />
        <circle cx="352" cy="92" fill="var(--fish-eye-color)" r="9" />
      </svg>

      <svg
        className="flappy-fish-svg__wing"
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 180 150"
      >
        <path
          d="M24 75C24 43 54 19 92 19C123 19 149 39 160 75C149 111 123 131 92 131C54 131 24 107 24 75Z"
          fill="var(--fish-fin-color)"
          stroke="var(--fish-outline-color)"
          strokeLinejoin="round"
          strokeWidth="8"
        />
      </svg>
    </span>
  );
}
