import fishBlue from "./assets/fish-blue.svg";
import fishYellow from "./assets/fish-yellow.svg";
import wingBlue from "./assets/wing-blue.svg";
import wingYellow from "./assets/wing-yellow.svg";
import "./flappy-fish-svg.css";

export const FLAPPY_FISH_SKINS = {
  blue: {
    body: fishBlue,
    label: "파란 물고기",
    wing: wingBlue,
  },
  yellow: {
    body: fishYellow,
    label: "노란 물고기",
    wing: wingYellow,
  },
};

export function FlappyFish({ className = "", skin = "blue" }) {
  const selectedSkin = FLAPPY_FISH_SKINS[skin] ?? FLAPPY_FISH_SKINS.blue;

  return (
    <span className={`flappy-fish-svg ${className}`.trim()} data-skin={skin}>
      <img alt="" aria-hidden="true" className="flappy-fish-svg__body" draggable="false" src={selectedSkin.body} />
      <img alt="" aria-hidden="true" className="flappy-fish-svg__wing" draggable="false" src={selectedSkin.wing} />
    </span>
  );
}
