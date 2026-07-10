import { useMemo, useRef, useState } from "react";
import { MiniGameCard } from "../components/MiniGameCard.jsx";
import { DEFAULT_MINIGAME_ID, getMinigameById, MINIGAME_CATALOG, MINIGAME_STATUS } from "../data/minigameCatalog.js";

function getInitialGame() {
  return getMinigameById(DEFAULT_MINIGAME_ID) ?? MINIGAME_CATALOG[0];
}

export function MiniGamesPage() {
  const [activeGameId, setActiveGameId] = useState(DEFAULT_MINIGAME_ID);
  const [activeFilter, setActiveFilter] = useState("All");
  const [theme, setTheme] = useState("dark");
  const playSectionRef = useRef(null);

  const activeGame = useMemo(() => getMinigameById(activeGameId) ?? getInitialGame(), [activeGameId]);
  const categories = useMemo(() => ["All", ...new Set(MINIGAME_CATALOG.map((game) => game.category))], []);
  const filteredGames = useMemo(() => {
    if (activeFilter === "All") return MINIGAME_CATALOG;
    return MINIGAME_CATALOG.filter((game) => game.category === activeFilter);
  }, [activeFilter]);
  const ActiveGameComponent = activeGame?.component;

  function selectGame(gameId) {
    setActiveGameId(gameId);
    window.requestAnimationFrame(() => {
      playSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  function selectOmok() {
    selectGame("omok");
  }

  return (
    <div className={`moment-app pal-${theme}`}>
      <div className="wrap minigames-page">
      <header className="card nav reveal">
        <a className="brand" href="#top" aria-label="Moment Play home"><span className="bd" aria-hidden="true" />moment<b>PLAY</b></a>
        <nav className="nav-links" aria-label="Moment Play navigation">
          <a className="nav-link on" href="#games">Games</a>
          <a className="nav-link" href="#omok">Omok</a>
          <a className="nav-link" href="#play">Play</a>
          <a className="nav-link" href="#future">Updates</a>
        </nav>
        <button className="mode-btn" type="button" onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}>
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </header>

      <section className="hero" id="top" aria-labelledby="moment-play-title">
        <div className="card h-main reveal d1">
          <span className="board-motif" aria-hidden="true" />
          <div>
            <div className="kicker">Mini games · <em>Online Omok</em></div>
            <h1 className="h-title" id="moment-play-title">Moment <em>Play</em></h1>
            <p className="h-sub">짧게 즐기는 퍼즐과 곧 확장될 1:1 오목을 한곳에서 시작하세요.</p>
          </div>
          <div className="h-cta">
            <a className="btn" href="#games">전체 게임 보기 <span className="arw" aria-hidden="true" /></a>
            <button className="btn-ghost" type="button" onClick={selectOmok}>오목 UI 보기</button>
          </div>
        </div>
        <div className="card h-visual reveal d2" aria-hidden="true">
          <div className="mini-board">
            <span className="stone is-black" style={{ top: "36%", left: "30%" }} />
            <span className="stone is-white" style={{ top: "36%", left: "47%" }} />
            <span className="stone is-black" style={{ top: "53%", left: "47%" }} />
            <span className="stone is-coral" style={{ top: "53%", left: "64%" }} />
          </div>
          <div className="tile-row">
            <div className="tile hot">2048</div>
            <div className="tile">Sudoku</div>
            <div className="tile">Sequence</div>
            <div className="tile">Omok</div>
          </div>
        </div>
      </section>

      <section className="duo" id="omok" aria-labelledby="omok-feature-title">
        <div className="card omok reveal d2">
          <span className="board-motif is-bottom" aria-hidden="true" />
          <div className="omok-head">
            <div>
              <div className="omok-t" id="omok-feature-title">오목 <small>Omok · 1 vs 1</small></div>
            </div>
            <span className="badge online">Online UI</span>
          </div>
          <div className="steps">
            <div className="stp on"><div className="n">01</div><div className="t">닉네임 입력</div></div>
            <div className="stp"><div className="n">02</div><div className="t">초대/매칭</div></div>
            <div className="stp"><div className="n">03</div><div className="t">대국 진행</div></div>
            <div className="stp"><div className="n">04</div><div className="t">결과 확인</div></div>
          </div>
          <p className="omok-copy">로그인, 전적, 초대 링크, 서버 매칭이 붙을 수 있도록 UI 상태와 실제 규칙 구현을 분리해 두었습니다.</p>
          <div className="omok-ctas">
            <button className="btn" type="button" onClick={selectOmok}>오목 화면 열기 <span className="arw" aria-hidden="true" /></button>
            <a className="btn-ghost" href="#games">다른 게임 보기</a>
          </div>
        </div>
        <div className="card qm reveal d3">
          <div>
            <div className="kicker">Quick match</div>
            <div className="qm-title">추후 서버 매칭 자리</div>
          </div>
          <label className="f-label" htmlFor="quick-nickname">Nickname</label>
          <input className="txt" id="quick-nickname" type="text" placeholder="대국에서 사용할 이름" maxLength="12" />
          <button className="btn" type="button" onClick={selectOmok}>초대 링크 UI 보기 <span className="arw" aria-hidden="true" /></button>
          <div className="qm-or">or</div>
          <button className="btn-ghost" type="button" onClick={selectOmok}>랜덤 매칭 UI 보기</button>
          <div className="waiting">
            <span className="spin" aria-hidden="true" />
            <p><b>Ready</b><br />서버 연동 전까지는 UI 미리보기로 동작합니다.</p>
          </div>
        </div>
      </section>

      <section className="section" id="games" aria-labelledby="games-title">
        <div className="sec-head">
          <span className="sec-title" id="games-title">전체 게임</span>
          <span className="sec-sub">All games</span>
        </div>
        <div className="chips" role="list" aria-label="Game category filters">
          {categories.map((category) => (
            <button
              className={`chipf${category === activeFilter ? " on" : ""}`}
              type="button"
              key={category}
              onClick={() => setActiveFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="minigame-hub ggrid" aria-label="Mini-game list">
          {filteredGames.map((game) => (
            <MiniGameCard
              key={game.id}
              game={game}
              isActive={game.id === activeGame?.id}
              onSelect={selectGame}
            />
          ))}
        </div>
      </section>

      <section className="game-card" id="play" ref={playSectionRef} aria-labelledby="active-game-title">
        <div className="sec-head game-card__head">
          <span className="sec-title" id="active-game-title">{activeGame?.title ?? "Game"}</span>
          <span className="sec-sub">{activeGame?.status === MINIGAME_STATUS.IN_PROGRESS ? "UI first" : "Now playing"}</span>
        </div>
        {ActiveGameComponent ? <ActiveGameComponent game={activeGame} /> : null}
      </section>

      <footer className="card footer" id="future">
        <a className="brand" href="#top"><span className="bd" aria-hidden="true" />moment<b>PLAY</b></a>
        <div className="foot-links">
          <a href="#games">Games</a><a href="#omok">Omok</a><a href="#play">Play</a><a href="#future">Updates</a>
        </div>
        <div className="foot-copy">© 2026 momentPLAY · UI prepared for account, records, matching, and future service integration.</div>
      </footer>
      </div>
    </div>
  );
}
