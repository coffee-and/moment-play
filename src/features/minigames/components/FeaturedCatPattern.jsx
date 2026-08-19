import ivoryCat from "../../../assets/figma/featured-cat-ivory.webp";
import orangeCat from "../../../assets/figma/featured-cat-orange.webp";
import yellowCat from "../../../assets/figma/featured-cat-yellow.webp";
import { catalogClassName as cx } from "../pages/catalogStyles.js";

const FEATURED_CATS = [
  { tone: "ivory", src: ivoryCat },
  { tone: "yellow", src: yellowCat },
  { tone: "orange", src: orangeCat },
];

export function FeaturedCatPattern() {
  return (
    <span className={cx("featured-cat-pattern")} aria-hidden="true">
      {FEATURED_CATS.map(({ tone, src }) => (
        <img
          key={tone}
          className={cx(`featured-cat-pattern__cat is-${tone}`)}
          src={src}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      ))}
    </span>
  );
}
