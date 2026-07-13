import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLeaderboard } from "../../infrastructure/supabase/gameResultsGateway.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { Button } from "../../shared/components/Button.jsx";
import { StatusPanel } from "../../shared/components/StatusPanel.jsx";
import {
  formatRankingDate,
  formatRankingValue,
  getRankingModeLabel,
  RANKING_GAME,
  RANKING_GAME_OPTIONS,
  SUDOKU_RANKING_MODES,
} from "./rankingConstants.js";

const LOAD_STATUS = { LOADING: "loading", READY: "ready", ERROR: "error" };

export function RankingPage() {
  const { isConfigured, status: authStatus } = useAuth();
  const [gameKey, setGameKey] = useState(RANKING_GAME.GAME_2048);
  const [sudokuMode, setSudokuMode] = useState(SUDOKU_RANKING_MODES[0].id);
  const [entries, setEntries] = useState([]);
  const [loadStatus, setLoadStatus] = useState(LOAD_STATUS.LOADING);
  const [reloadKey, setReloadKey] = useState(0);
  const activeGame = RANKING_GAME_OPTIONS.find((game) => game.id === gameKey);
  const mode = gameKey === RANKING_GAME.SUDOKU ? sudokuMode : null;

  const retry = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    if (gameKey === RANKING_GAME.OMOK || !isConfigured) {
      setEntries([]);
      setLoadStatus(LOAD_STATUS.READY);
      return undefined;
    }

    let active = true;
    setLoadStatus(LOAD_STATUS.LOADING);
    fetchLeaderboard({ gameKey, mode })
      .then((nextEntries) => {
        if (!active) return;
        setEntries(nextEntries);
        setLoadStatus(LOAD_STATUS.READY);
      })
      .catch(() => {
        if (!active) return;
        setLoadStatus(LOAD_STATUS.ERROR);
      });
    return () => { active = false; };
  }, [gameKey, isConfigured, mode, reloadKey]);

  return (
    <section className="wrap ranking-page" aria-labelledby="ranking-title">
      <header className="ranking-page__header">
        <p className="eyebrow">Leaderboard</p>
        <h1 id="ranking-title">랭킹</h1>
        <p>각 게임의 최고 기록을 확인해 보세요. 플레이는 로그인 없이 계속할 수 있습니다.</p>
      </header>

      {authStatus !== "authenticated" ? (
        <div className="ranking-page__guest card">
          <p>로그인하면 완료한 게임 기록을 랭킹에 저장할 수 있어요.</p>
          <Button as={Link} to="/login" size="small">로그인</Button>
        </div>
      ) : null}

      <div className="ranking-filters" role="tablist" aria-label="게임 선택">
        {RANKING_GAME_OPTIONS.map((game) => (
          <button
            className={`chipf${game.id === gameKey ? " on" : ""}`}
            type="button"
            role="tab"
            aria-selected={game.id === gameKey}
            key={game.id}
            onClick={() => setGameKey(game.id)}
          >
            {game.label}
          </button>
        ))}
      </div>

      {gameKey === RANKING_GAME.SUDOKU ? (
        <div className="ranking-filters ranking-filters--mode" role="group" aria-label="Sudoku 난이도">
          {SUDOKU_RANKING_MODES.map((modeOption) => (
            <button
              className={`chipf${modeOption.id === sudokuMode ? " on" : ""}`}
              type="button"
              key={modeOption.id}
              onClick={() => setSudokuMode(modeOption.id)}
            >
              {modeOption.label}
            </button>
          ))}
        </div>
      ) : null}

      {gameKey === RANKING_GAME.OMOK ? (
        <StatusPanel
          title="Omok 랭킹은 준비 중입니다"
          description="완료된 온라인 대국을 서버에서 확정하는 결과 모델이 아직 없어, 조작 가능한 클라이언트 승리를 랭킹으로 저장하지 않습니다."
        />
      ) : null}

      {gameKey !== RANKING_GAME.OMOK && !isConfigured ? (
        <StatusPanel type="error" title="랭킹 서버가 연결되지 않았습니다" description="Supabase 환경 설정을 확인해 주세요." />
      ) : null}

      {gameKey !== RANKING_GAME.OMOK && isConfigured && loadStatus === LOAD_STATUS.LOADING ? (
        <div className="card ranking-page__loading" role="status">
          <span className="ranking-page__spinner" aria-hidden="true" />
          랭킹을 불러오는 중…
        </div>
      ) : null}

      {gameKey !== RANKING_GAME.OMOK && isConfigured && loadStatus === LOAD_STATUS.ERROR ? (
        <StatusPanel
          type="error"
          title="랭킹을 불러오지 못했습니다"
          description="잠시 후 다시 시도해 주세요."
          action={<Button type="button" onClick={retry}>다시 시도</Button>}
        />
      ) : null}

      {gameKey !== RANKING_GAME.OMOK && isConfigured && loadStatus === LOAD_STATUS.READY && entries.length === 0 ? (
        <StatusPanel title="아직 등록된 기록이 없습니다" description={`${activeGame.label}의 첫 번째 랭킹 기록을 만들어 보세요.`} />
      ) : null}

      {gameKey !== RANKING_GAME.OMOK && loadStatus === LOAD_STATUS.READY && entries.length > 0 ? (
        <div className="card ranking-table-wrap">
          <table className="ranking-table">
            <thead><tr><th>순위</th><th>닉네임</th><th>모드</th><th>{activeGame.valueLabel}</th><th>완료일</th></tr></thead>
            <tbody>
              {entries.map((entry) => (
                <tr className={entry.isCurrentUser ? "is-current-user" : undefined} key={`${entry.rank}-${entry.nickname}-${entry.createdAt}`}>
                  <td data-label="순위"><strong>#{entry.rank}</strong></td>
                  <td data-label="닉네임">{entry.nickname}{entry.isCurrentUser ? <span className="ranking-table__you">나</span> : null}</td>
                  <td data-label="모드">{getRankingModeLabel(entry.mode)}</td>
                  <td data-label={activeGame.valueLabel}>{formatRankingValue(entry)}</td>
                  <td data-label="완료일"><time dateTime={entry.createdAt}>{formatRankingDate(entry.createdAt)}</time></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
