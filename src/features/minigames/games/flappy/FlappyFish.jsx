import "./flappy-fish-svg.css";

export const FLAPPY_FISH_SKINS = {
  blue: {
    body: "#AFC8EC",
    fin: "#6E8FBC",
    label: "파란 고래",
    tail: "#91ACD4",
  },
  yellow: {
    body: "#F5C84E",
    fin: "#D89325",
    label: "노란 물고기",
    tail: "#E9AE30",
  },
};

export function FlappyFish({ className = "", skin = "blue" }) {
  const selectedSkin = FLAPPY_FISH_SKINS[skin] ?? FLAPPY_FISH_SKINS.blue;

  return (
    <span
      aria-hidden="true"
      className={`flappy-fish-svg ${className}`.trim()}
      data-skin={skin}
      style={{
        "--fish-body-color": selectedSkin.body,
        "--fish-fin-color": selectedSkin.fin,
        "--fish-tail-color": selectedSkin.tail,
      }}
    >
      <svg className="flappy-fish-svg__tail" focusable="false" viewBox="0 0 160 160">
        <path
          d="M48 144A32 32 0 0 1 48 80A32 32 0 0 1 48 16Q99.2 16 144 80Q99.2 144 48 144Z"
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
          rx="200"
          ry="98"
          stroke="var(--fish-outline-color)"
          strokeWidth="8"
        />
        <circle cx="355" cy="88" fill="var(--fish-eye-color)" r="9" />
      </svg>

      <svg className="flappy-fish-svg__wing" focusable="false" viewBox="0 0 190 190">
        <path
          d="M57 171A38 38 0 0 1 57 95A38 38 0 0 1 57 19Q117.8 19 171 95Q117.8 171 57 171Z"
          fill="var(--fish-fin-color)"
          stroke="var(--fish-outline-color)"
          strokeLinejoin="round"
          strokeWidth="8"
        />
      </svg>
    </span>
  );
}
