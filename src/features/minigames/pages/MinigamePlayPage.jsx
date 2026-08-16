import { Suspense, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../../shared/auth/AuthContext.jsx";
import { LOGIN_PATH } from "../../../shared/auth/authConstants.js";
import { buildAuthRoute } from "../../../shared/auth/returnTo.js";
import { LoadingIndicator } from "../../../shared/components/LoadingIndicator.jsx";
import { StatusPanel } from "../../../shared/components/StatusPanel.jsx";
import { Button } from "../../../shared/components/Button.jsx";
import { MINIGAME_STATUS, getMinigameById } from "../data/minigameCatalog.js";
import { getMinigameComponent } from "../data/minigameRegistry.js";
import { GameGuideProvider } from "../shared/components/GameGuideContext.jsx";

function MinigameBlockingState(props) {
  return (
    <div className="wrap minigame-play-page minigame-play-page--blocking">
      <StatusPanel {...props} />
    </div>
  );
}

function MinigameLoadingState({ game }) {
  return (
    <MinigameBlockingState
      title={game.title}
      description="게임을 불러오고 있어요."
      action={<LoadingIndicator label={`${game.title} 불러오는 중`} />}
    />
  );
}

function MinigameRouteSession({ gameId, roomId, returnTo }) {
  const { status: authStatus } = useAuth();
  const [hasStarted, setHasStarted] = useState(false);
  const game = getMinigameById(gameId);
  const ActiveGameComponent = game ? getMinigameComponent(game.id) : null;

  if (!game) {
    return (
      <MinigameBlockingState
        type="notFound"
        title="게임을 찾을 수 없어요"
        description="요청하신 게임이 존재하지 않아요."
        action={
          <Button as={Link} to="/" variant="primary">
            게임 목록으로
          </Button>
        }
      />
    );
  }

  if (!ActiveGameComponent || game.status === MINIGAME_STATUS.COMING_SOON) {
    return (
      <MinigameBlockingState
        type="comingSoon"
        title="Coming Soon"
        description="이 게임은 아직 준비 중이에요."
        action={
          <Button as={Link} to="/" variant="primary">
            게임 목록으로
          </Button>
        }
      />
    );
  }

  const guideDescription = game.guide?.description ?? game.howTo;
  if (authStatus === "loading") {
    return (
      <MinigameBlockingState
        title={game.title}
        description={guideDescription}
        action={<LoadingIndicator label="로그인 상태 확인 중" />}
      />
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <MinigameBlockingState
        title={game.title}
        description={guideDescription}
        action={(
          <Button as={Link} to={buildAuthRoute(LOGIN_PATH, returnTo)} variant="primary">
            로그인하고 시작하기
          </Button>
        )}
      />
    );
  }

  if (!hasStarted) {
    return (
      <MinigameBlockingState
        title={game.title}
        description={guideDescription}
        action={(
          <Button type="button" variant="primary" onClick={() => setHasStarted(true)}>
            {roomId ? "대기실 입장하기" : "게임 시작하기"}
          </Button>
        )}
      />
    );
  }

  return (
    <Suspense fallback={<MinigameLoadingState game={game} />}>
      <div className="wrap minigame-play-page minigame-play-page--active">
        <GameGuideProvider guide={game.guide ?? { description: game.howTo }}>
          <ActiveGameComponent game={game} roomId={roomId ?? null} />
        </GameGuideProvider>
      </div>
    </Suspense>
  );
}

export function MinigamePlayPage() {
  const { gameId, roomId } = useParams();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  return (
    <MinigameRouteSession
      key={location.pathname}
      gameId={gameId}
      roomId={roomId}
      returnTo={returnTo}
    />
  );
}
