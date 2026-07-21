import { Link, useParams } from "react-router-dom";
import { StatusPanel } from "../../../shared/components/StatusPanel.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { MINIGAME_STATUS, getMinigameById } from "../data/minigameCatalog.js";
import { getMinigameComponent } from "../data/minigameRegistry.js";
import { GameGuideProvider } from "../shared/components/GameGuideContext.jsx";

export function MinigamePlayPage() {
  const { gameId, roomId } = useParams();
  const game = getMinigameById(gameId);
  const ActiveGameComponent = game ? getMinigameComponent(game.id) : null;

  if (!game) {
    return (
      <div className="wrap">
        <StatusPanel
          type="notFound"
          title="게임을 찾을 수 없어요"
          description="요청하신 게임이 존재하지 않아요."
          action={
            <Button as={Link} to="/" variant="primary">
              게임 목록으로
            </Button>
          }
        />
      </div>
    );
  }

  if (!ActiveGameComponent || game.status === MINIGAME_STATUS.COMING_SOON) {
    return (
      <div className="wrap">
        <StatusPanel
          type="comingSoon"
          title="Coming Soon"
          description="이 게임은 아직 준비 중이에요."
          action={
            <Button as={Link} to="/" variant="primary">
              게임 목록으로
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="wrap minigame-play-page">
      <GameGuideProvider guide={{ description: game.howTo }}>
        <ActiveGameComponent game={game} roomId={roomId ?? null} />
      </GameGuideProvider>
    </div>
  );
}
