import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MiniGameCard } from "../components/MiniGameCard.jsx";
import { getMinigameById, MINIGAME_CATALOG, MINIGAME_CATEGORY_ORDER } from "../data/minigameCatalog.js";

export function MiniGamesPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const categories = MINIGAME_CATEGORY_ORDER;
  const filteredGames = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ko");
    return MINIGAME_CATALOG.filter((game) => {
      const matchesCategory = activeFilter === "All" || game.category === activeFilter;
      const matchesQuery = !normalizedQuery || `${game.title} ${game.description}`.toLocaleLowerCase("ko").includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeFilter, searchQuery]);

  function openGame(gameId) {
    const game = getMinigameById(gameId);
    if (game) navigate(game.route);
  }

  return (
    <div className="wrap minigames-page games-page">
      <section className="page-content section games-catalog" id="games" aria-labelledby="games-title">
        <div className="sec-head">
          <div><h2 className="page-title" id="games-title">ALL GAMES</h2><p className="sec-description">오늘은 어떤 게임을 해볼까요?</p></div>
          <label className="game-search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">게임 이름 검색</span>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="게임 이름 검색" />
          </label>
        </div>
        <div className="chips" role="group" aria-label="게임 카테고리 필터">
          {categories.map((category) => <button className={`chipf${category === activeFilter ? " on" : ""}`} type="button" key={category} aria-pressed={category === activeFilter} onClick={() => setActiveFilter(category)}>{category}</button>)}
        </div>
        <div className="minigame-hub ggrid" aria-label="Mini-game list">
          {filteredGames.map((game) => <MiniGameCard key={game.id} game={game} onSelect={openGame} variant="catalog" />)}
        </div>
        {filteredGames.length === 0 ? <p className="games-empty">조건에 맞는 게임이 없어요.</p> : null}
      </section>
    </div>
  );
}
