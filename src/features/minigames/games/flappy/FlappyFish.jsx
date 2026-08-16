import "./flappy-fish-svg.css";

export function FlappyFish({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={`flappy-fish-svg ${className}`.trim()}
      focusable="false"
      viewBox="0 0 110 48"
    >
      <g className="flappy-fish-svg__tail">
        <path
          d="M25 23C18 15 10 10 5 11C4 16 6 21 10 24C6 27 4 32 5 37C11 38 19 33 25 26Z"
          fill="var(--flappy-tail)"
        />
      </g>
      <path
        className="flappy-fish-svg__body"
        d="M22 24C28 10 46 5 66 6C84 7 100 14 106 24C100 34 84 41 66 42C46 43 28 38 22 24Z"
        fill="var(--flappy-fish)"
      />
      <circle className="flappy-fish-svg__eye" cx="88" cy="19" r="2.6" />
    </svg>
  );
}
