import whaleBlue from "./assets/whale-blue.svg";
import fishYellow from "./assets/fish-yellow.svg";
import finWhaleBlue from "./assets/fin-whale-blue.svg";
import wingYellow from "./assets/wing-yellow.svg";
import "./flappy-fish-svg.css";

export const FLAPPY_FISH_SKINS = {
  blue: {
    body: whaleBlue,
    label: "파란 고래",
    wing: finWhaleBlue,
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
