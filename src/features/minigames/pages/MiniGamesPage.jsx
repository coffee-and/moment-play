import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MiniGameCard } from "../components/MiniGameCard.jsx";
import { getMinigameById, MINIGAME_CATALOG } from "../data/minigameCatalog.js";

export function MiniGamesPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("All");
  const categories = useMemo(() => ["All", ...new Set(MINIGAME_CATALOG.map((game) => game.category))], []);
  const filteredGames = useMemo(() => activeFilter === "All"
    ? MINIGAME_CATALOG
    : MINIGAME_CATALOG.filter((game) => game.category === activeFilter), [activeFilter]);

  function openGame(gameId) {
    const game = getMinigameById(gameId);
    if (game) navigate(game.route);
  }

  return (
    <div className="wrap minigames-page">
      <section className="hero" id="top" aria-labelledby="moment-play-title">
        <div className="card h-main reveal d1">
          <span className="board-motif" aria-hidden="true" />
          <div>
            <div className="kicker">Mini games · <em>Moment Play</em></div>
            <h1 className="h-title" id="moment-play-title">Moment <em>Play</em></h1>
            <p className="h-sub">짧은 순간에도 바로 시작할 수 있는 퍼즐과 보드게임을 만나보세요.</p>
          </div>
          <div className="h-cta">
            <a className="btn" href="#games">게임 둘러보기 <span className="arw" aria-hidden="true" /></a>
            <button className="btn-ghost" type="button" onClick={() => openGame("omok")}>오목 시작하기</button>
          </div>
        </div>
        <div className="card h-visual reveal d2" aria-hidden="true">
          <div className="mini-board">
            <span className="stone is-black" style={{ top: "36%", left: "30%" }} />
            <span className="stone is-white" style={{ top: "36%", left: "47%" }} />
            <span className="stone is-black" style={{ top: "53%", left: "47%" }} />
            <span className="stone is-coral" style={{ top: "53%", left: "64%" }} />
          </div>
          <div className="tile-row"><div className="tile hot">2048</div><div className="tile">Sudoku</div><div className="tile">Sequence</div><div className="tile">Omok</div></div>
        </div>
      </section>

      <section className="duo minigames-page__featured" id="featured" aria-labelledby="featured-title">
        <div className="card omok reveal d2">
          <span className="board-motif is-bottom" aria-hidden="true" />
          <div className="omok-head"><div className="omok-t" id="featured-title">오늘의 추천 <small>Omok · 1 vs 1</small></div><span className="badge online">Board</span></div>
          <p className="omok-copy">친구를 초대하거나 컴퓨터와 대국하며 Standard와 Free 규칙을 골라 즐겨보세요.</p>
          <div className="omok-ctas"><button className="btn" type="button" onClick={() => openGame("omok")}>오목 시작하기 <span className="arw" aria-hidden="true" /></button></div>
        </div>
      </section>

      <section className="section" id="games" aria-labelledby="games-title">
        <div className="sec-head"><span className="sec-title" id="games-title">전체 게임</span><span className="sec-sub">All games</span></div>
        <div className="chips" role="list" aria-label="Game category filters">
          {categories.map((category) => <button className={`chipf${category === activeFilter ? " on" : ""}`} type="button" key={category} onClick={() => setActiveFilter(category)}>{category}</button>)}
        </div>
        <div className="minigame-hub ggrid" aria-label="Mini-game list">
          {filteredGames.map((game) => <MiniGameCard key={game.id} game={game} isActive={false} onSelect={openGame} />)}
        </div>
      </section>

      <footer className="card footer" id="about">
        <a className="brand" href="#top"><span className="bd" aria-hidden="true" />moment<b>PLAY</b></a>
        <div className="foot-links"><a href="#games">Games</a><a href="#featured">Featured</a><a href="#about">About</a></div>
        <div className="foot-copy">© 2026 momentPLAY · 짧은 순간을 위한 미니게임.</div>
      </footer>
    </div>
  );
}
