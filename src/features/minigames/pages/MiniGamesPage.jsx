import { useMemo, useState } from "react";
import { MiniGameCard } from "../components/MiniGameCard.jsx";
import { DEFAULT_MINIGAME_ID, getMinigameById, MINIGAME_CATALOG } from "../data/minigameCatalog.js";

function getInitialGame() {
  return getMinigameById(DEFAULT_MINIGAME_ID) ?? MINIGAME_CATALOG[0];
}

export function MiniGamesPage() {
  const [activeGameId, setActiveGameId] = useState(DEFAULT_MINIGAME_ID);

  const activeGame = useMemo(() => getMinigameById(activeGameId) ?? getInitialGame(), [activeGameId]);
  const ActiveGameComponent = activeGame?.component;

  return (
    <div className="app-shell minigames-page">
      <header className="app-header">
        <h1>Moment Play</h1>
        <p>Mini-game hub</p>
      </header>

      <section className="minigame-hub" aria-label="Mini-game list">
        {MINIGAME_CATALOG.map((game) => (
          <MiniGameCard
            key={game.id}
            game={game}
            isActive={game.id === activeGame?.id}
            onSelect={setActiveGameId}
          />
        ))}
      </section>

      <div className="game-card">
        {ActiveGameComponent ? <ActiveGameComponent game={activeGame} /> : null}
      </div>
    </div>
  );
}
