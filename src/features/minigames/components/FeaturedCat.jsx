import catFaceSparkles from "../../../assets/figma/cat-face-sparkles.png";
import featuredCatLight from "../../../assets/figma/featured-cat-light.png";

export function FeaturedCat() {
  return (
    <>
      <img className="featured-cat" src={featuredCatLight} alt="" />
      <img className="featured-cat-sparkles" src={catFaceSparkles} alt="" />
    </>
  );
}
