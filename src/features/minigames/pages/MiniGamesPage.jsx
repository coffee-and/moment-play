import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { AUTH_LABELS, getAccountLabel, LOGIN_PATH, SIGNUP_PATH } from "../../../shared/auth/authConstants.js";
import { Brand } from "../../../shared/components/Brand.jsx";
import { MiniGameCard } from "../components/MiniGameCard.jsx";
import { getMinigameById, MINIGAME_CATALOG } from "../data/minigameCatalog.js";

function FooterAccountItem() {
  const { status, user } = useAuth();

  if (status === "loading") return <span aria-label={AUTH_LABELS.loading} />;
  if (status === "anonymous") return <Link to={SIGNUP_PATH}>{AUTH_LABELS.createAccount}</Link>;
  if (status === "authenticated") return <span>{getAccountLabel(user)}</span>;
  return <Link to={LOGIN_PATH}>{AUTH_LABELS.login}</Link>;
}

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
      <section className="greet reveal d1" id="top">
        <h1>오늘은 어떤 게임으로 시작해볼까요?</h1>
        <p>짧은 순간에도 바로 시작할 수 있는 퍼즐과 보드게임을 만나보세요.</p>
      </section>

      <section className="section" aria-labelledby="featured-title">
        <button type="button" className="featured reveal d2" onClick={() => openGame("omok")}>
          <span className="fx" aria-hidden="true" />
          <span className="f-body">
            <span className="f-tag">★ Featured</span>
            <h2 id="featured-title">오목</h2>
            <p>다섯 개를 먼저 잇는 정통 전략 게임. 오늘 머리 좀 굴려볼까요?</p>
            <span className="f-action">바로 플레이<span className="arw" aria-hidden="true" /></span>
          </span>
          <span className="f-art" aria-hidden="true">
            <span className="board">
              <span className="stone is-black" style={{ top: "55%", left: "35%" }} />
              <span className="stone is-white" style={{ top: "55%", left: "55%" }} />
              <span className="stone is-black" style={{ top: "35%", left: "55%" }} />
              <span className="stone is-accent" style={{ top: "75%", left: "75%" }} />
            </span>
          </span>
        </button>
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

      <footer className="card footer">
        <Brand />
        <div className="foot-links"><Link to="/">홈</Link><Link to="/#games">게임</Link><FooterAccountItem /></div>
        <div className="foot-copy">© 2026 momentPLAY · 짧은 순간을 위한 미니게임.</div>
      </footer>
    </div>
  );
}
