import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeaturedCat } from "../components/FeaturedCat.jsx";
import { MiniGameCard } from "../components/MiniGameCard.jsx";
import { getMinigameById, MINIGAME_CATALOG } from "../data/minigameCatalog.js";

export function MiniGamesPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const categories = useMemo(() => ["All", ...new Set(MINIGAME_CATALOG.map((game) => game.category))], []);
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
    <div className="wrap minigames-page">
      <section className="greet reveal d1" id="top">
        <h1>오늘은 어떤 게임으로 시작해볼까요?</h1>
        <p>짧은 순간에도 바로 시작할 수 있는 퍼즐과 보드게임을 만나보세요.</p>
      </section>

      <section className="section" aria-labelledby="featured-title">
        <button type="button" className="featured reveal d2" onClick={() => openGame("omok")}>
          <span className="f-body">
            <span className="f-tag">★ Featured</span>
            <h2 id="featured-title">오목</h2>
            <p>조용히 생각하고, 결정적인 한 수를 놓아보세요.</p>
            <span className="f-action">바로 플레이<span className="arw" aria-hidden="true" /></span>
          </span>
          <span className="f-art"><FeaturedCat /></span>
        </button>
      </section>

      <section className="section" id="games" aria-labelledby="games-title">
        <div className="sec-head">
          <div><h2 className="sec-title" id="games-title">모든 게임</h2><p className="sec-description">오늘은 어떤 게임을 해볼까요?</p></div>
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
          {filteredGames.map((game) => <MiniGameCard key={game.id} game={game} onSelect={openGame} />)}
        </div>
        {filteredGames.length === 0 ? <p className="games-empty">조건에 맞는 게임이 없어요.</p> : null}
      </section>
    </div>
  );
}
