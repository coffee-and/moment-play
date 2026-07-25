import "./flappy-fish-svg.css";

const FIXED_FISH_COLORS = {
  body: "#CDB9EC",
  fin: "#6E8FBC",
  tail: "#CDB9EC",
};

// 기존 저장값과 테스트 호환성은 유지하되 실제 렌더링은 하나의 물고기 디자인으로 고정합니다.
export const FLAPPY_FISH_SKINS = {
  blue: { ...FIXED_FISH_COLORS, label: "별빛 물고기" },
  yellow: { ...FIXED_FISH_COLORS, label: "별빛 물고기" },
};

export function FlappyFish({ className = "", skin = "blue" }) {
  return (
    <span
      aria-hidden="true"
      className={`flappy-fish-svg ${className}`.trim()}
      data-skin={skin}
      style={{
        "--fish-body-color": FIXED_FISH_COLORS.body,
        "--fish-fin-color": FIXED_FISH_COLORS.fin,
        "--fish-tail-color": FIXED_FISH_COLORS.tail,
      }}
    >
      <svg
        className="flappy-fish-svg__tail"
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 160 160"
      >
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
          ry="82"
          stroke="var(--fish-outline-color)"
          strokeWidth="8"
        />
        <circle cx="350" cy="98" fill="var(--fish-eye-color)" r="9" />
      </svg>

      <svg
        className="flappy-fish-svg__wing"
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 190 190"
      >
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
