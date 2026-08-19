import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MiniGameCard } from "../components/MiniGameCard.jsx";
import { getMinigameById, MINIGAME_CATALOG, MINIGAME_CATEGORY_ORDER } from "../data/minigameCatalog.js";
import { catalogClassName as cx } from "./catalogStyles.js";

export function MiniGamesPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("All");
  const categories = MINIGAME_CATEGORY_ORDER;
  const visibleGames = activeFilter === "All"
    ? MINIGAME_CATALOG
    : MINIGAME_CATALOG.filter((game) => game.category === activeFilter);

  function openGame(gameId) {
    const game = getMinigameById(gameId);
    if (game) navigate(game.route);
  }

  return (
    <div className={cx("wrap minigames-page games-page")}>
      <section className={cx("page-content section games-catalog")} id="games" aria-labelledby="games-title">
        <div className={cx("sec-head")}>
          <div><h2 className={cx("page-title")} id="games-title">ALL GAMES</h2><p className={cx("sec-description")}>오늘은 어떤 게임을 해볼까요?</p></div>
        </div>
        <div className={cx("chips")} role="group" aria-label="게임 카테고리 필터">
          {categories.map((category) => <button className={cx(`chipf${category === activeFilter ? " on" : ""}`)} type="button" key={category} aria-pressed={category === activeFilter} onClick={() => setActiveFilter(category)}>{category}</button>)}
        </div>
        <div className={cx("minigame-hub ggrid")} aria-label="Mini-game list">
          {visibleGames.map((game) => <MiniGameCard key={game.id} game={game} onSelect={openGame} variant="catalog" />)}
        </div>
      </section>
    </div>
  );
}
