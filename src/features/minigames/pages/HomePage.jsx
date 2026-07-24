import { useNavigate } from "react-router-dom";
import { FeaturedCatPattern } from "../components/FeaturedCatPattern.jsx";
import { MiniGameCard } from "../components/MiniGameCard.jsx";
import { getMinigameById, MINIGAME_CATALOG, MINIGAME_STATUS } from "../data/minigameCatalog.js";

export function HomePage() {
  const navigate = useNavigate();
  const homeGames = MINIGAME_CATALOG.filter((game) => game.status === MINIGAME_STATUS.AVAILABLE);

  function openGame(gameId) {
    const game = getMinigameById(gameId);
    if (game) navigate(game.route);
  }

  return (
    <div className="wrap home-page">
      <section className="page-content greet reveal d1" id="top">
        <h1 className="page-title">What will you play today?</h1>
        <p>짧은 순간에도 바로 시작할 수 있는 퍼즐과 미니게임을 만나보세요.</p>
      </section>

      <section className="page-content section featured-section" aria-labelledby="featured-title">
        <button type="button" className="featured reveal d2" onClick={() => openGame("omok")}>
          <span className="f-body">
            <span className="f-tag">Featured</span>
            <h2 id="featured-title">OMOK</h2>
            <p>조용히 생각하고, 결정적인 한 수를 놓아보세요.</p>
            <span className="f-action">PLAY NOW</span>
          </span>
          <FeaturedCatPattern />
        </button>
      </section>

      <section className="page-content section home-games" aria-label="추천 게임">
        <div className="home-games-grid">
          {homeGames.map((game) => (
            <MiniGameCard key={game.id} game={game} onSelect={openGame} variant="home" showCategory />
          ))}
        </div>
      </section>
    </div>
  );
}
