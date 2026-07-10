import { Link } from "react-router-dom";
import { Button } from "../../../shared/components/Button.jsx";
import { StatGrid, StatItem } from "../../../shared/components/StatGrid.jsx";
import { StatusPanel } from "../../../shared/components/StatusPanel.jsx";
import { MINIGAME_STATUS, STATUS_PLAY_BUTTON_LABEL, STATUS_PLAY_LABEL } from "../data/minigameCatalog.js";
import { getMinigameComponent } from "../data/minigameRegistry.js";

export function GameDetailSection({ game, personalRecord }) {
  if (!game) return null;

  const hasComponent = Boolean(getMinigameComponent(game.id));
  const canPlay = hasComponent && game.status !== MINIGAME_STATUS.COMING_SOON;

  return (
    <div className="game-detail">
      <div className="game-detail__info">
        <span className="badge">{game.category}</span>
        <h3 className="game-detail__title">{game.title}</h3>
        <p className="game-detail__desc">{game.description}</p>
        {game.howTo ? <p className="game-detail__howto">{game.howTo}</p> : null}
        <span className="game-detail__status">{STATUS_PLAY_LABEL[game.status] ?? game.status}</span>
      </div>

      <div className="game-detail__records">
        <strong className="game-detail__section-title">내 기록</strong>
        {personalRecord && personalRecord.length > 0 ? (
          <StatGrid>
            {personalRecord.map((stat) => (
              <StatItem key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </StatGrid>
        ) : (
          <StatusPanel
            type="empty"
            title="아직 기록이 없어요"
            description="게임을 플레이하면 이곳에 나만의 기록이 남아요."
          />
        )}
      </div>

      <div className="game-detail__ranking">
        <strong className="game-detail__section-title">랭킹</strong>
        {/* TODO: swap for getGameRanking(game.id) once the ranking API is integrated. */}
        <StatusPanel
          type="comingSoon"
          title="온라인 랭킹 준비 중"
          description="서버 연동 후 랭킹이 제공될 예정이에요."
        />
      </div>

      <Button
        as={canPlay ? Link : "button"}
        to={canPlay ? game.route : undefined}
        variant="primary"
        fullWidth
        disabled={!canPlay}
      >
        {STATUS_PLAY_BUTTON_LABEL[game.status] ?? "Play Game"}
      </Button>
    </div>
  );
}
