import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLeaderboard } from "../../infrastructure/supabase/gameResultsGateway.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { AUTH_LABELS, LOGIN_PATH } from "../../shared/auth/authConstants.js";
import { Button } from "../../shared/components/Button.jsx";
import { LoadingIndicator } from "../../shared/components/LoadingIndicator.jsx";
import { StatusPanel } from "../../shared/components/StatusPanel.jsx";
import {
  formatRankingDate,
  formatRankingValue,
  getRankingGame,
  RANKING_GAMES,
} from "./rankingRegistry.js";
import styles from "./RankingPage.module.css";

const LOAD_STATUS = { LOADING: "loading", READY: "ready", ERROR: "error" };

export function RankingPage() {
  const { isConfigured, status: authStatus } = useAuth();
  const [gameKey, setGameKey] = useState(RANKING_GAMES[0].gameKey);
  const [boardKey, setBoardKey] = useState(RANKING_GAMES[0].boards[0].boardKey);
  const [entries, setEntries] = useState([]);
  const [loadStatus, setLoadStatus] = useState(LOAD_STATUS.LOADING);
  const [reloadKey, setReloadKey] = useState(0);
  const activeGame = getRankingGame(gameKey);
  const activeBoard = activeGame.boards.find((board) => board.boardKey === boardKey)
    ?? activeGame.boards[0];

  const retry = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    if (!isConfigured) {
      setEntries([]);
      setLoadStatus(LOAD_STATUS.READY);
      return undefined;
    }

    let active = true;
    setLoadStatus(LOAD_STATUS.LOADING);
    fetchLeaderboard({
      boardKey: activeBoard.boardKey,
      challengeKey: activeBoard.challengeKey,
      gameKey,
      rulesVersion: activeBoard.rulesVersion,
    })
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
  }, [activeBoard, gameKey, isConfigured, reloadKey]);

  function selectGame(nextGameKey) {
    const nextGame = getRankingGame(nextGameKey);
    setGameKey(nextGameKey);
    setBoardKey(nextGame.boards[0].boardKey);
  }

  return (
    <section className={`wrap ${styles.page}`} aria-labelledby="ranking-title">
      <header className={styles.header}>
        <p className="eyebrow">Leaderboard</p>
        <h1 className="page-title" id="ranking-title">RANKING</h1>
        <p>각 게임의 최고 기록을 확인해 보세요. 플레이는 로그인 없이 계속할 수 있습니다.</p>
      </header>

      {authStatus !== "authenticated" ? (
        <div className={`card ${styles.guest}`}>
          <p>로그인하면 완료한 게임 기록을 랭킹에 저장할 수 있어요.</p>
          <Button as={Link} to={LOGIN_PATH} size="small">{AUTH_LABELS.login}</Button>
        </div>
      ) : null}

      <div className={styles.filters} role="tablist" aria-label="게임 선택">
        {RANKING_GAMES.map((game) => (
          <button
            className={`chipf${game.gameKey === gameKey ? " on" : ""}`}
            type="button"
            role="tab"
            aria-selected={game.gameKey === gameKey}
            key={game.gameKey}
            onClick={() => selectGame(game.gameKey)}
          >
            {game.label}
          </button>
        ))}
      </div>

      {activeGame.boards.length > 1 ? (
        <div className={`${styles.filters} ${styles.modeFilters}`} role="group" aria-label={`${activeGame.label} 랭킹 구분`}>
          {activeGame.boards.map((board) => (
            <button
              className={`chipf${board.boardKey === activeBoard.boardKey ? " on" : ""}`}
              type="button"
              key={board.boardKey}
              onClick={() => setBoardKey(board.boardKey)}
            >
              {board.label}
            </button>
          ))}
        </div>
      ) : null}

      {!isConfigured ? (
        <StatusPanel title="랭킹 서버가 연결되지 않았습니다" description="Supabase 환경 설정을 확인해 주세요." />
      ) : null}

      {isConfigured && loadStatus === LOAD_STATUS.LOADING ? (
        <div className={`card ${styles.loading}`}>
          <LoadingIndicator label="랭킹을 불러오는 중…" />
        </div>
      ) : null}

      {isConfigured && loadStatus === LOAD_STATUS.ERROR ? (
        <StatusPanel
          type="error"
          title="랭킹을 불러오지 못했습니다"
          description="잠시 후 다시 시도해 주세요."
          action={<Button type="button" onClick={retry}>다시 시도</Button>}
        />
      ) : null}

      {isConfigured && loadStatus === LOAD_STATUS.READY && entries.length === 0 ? (
        <StatusPanel title="아직 등록된 기록이 없습니다" description={`${activeGame.label}의 첫 번째 랭킹 기록을 만들어 보세요.`} />
      ) : null}

      {loadStatus === LOAD_STATUS.READY && entries.length > 0 ? (
        <div className={`card ${styles.tableWrap}`}>
          <table className={styles.table}>
            <thead><tr><th>순위</th><th>닉네임</th><th>구분</th><th>{activeBoard.valueLabel}</th><th>완료일</th></tr></thead>
            <tbody>
              {entries.map((entry) => (
                <tr className={entry.isCurrentUser ? styles.currentUser : undefined} key={`${entry.rank}-${entry.nickname}-${entry.createdAt}`}>
                  <td data-label="순위"><strong>#{entry.rank}</strong></td>
                  <td data-label="닉네임">{entry.nickname}{entry.isCurrentUser ? <span className={styles.you}>나</span> : null}</td>
                  <td data-label="구분">{activeBoard.label}</td>
                  <td data-label={activeBoard.valueLabel}>{formatRankingValue(entry, activeBoard)}</td>
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
