import { useState } from "react";
import { Button } from "../../../../shared/components/Button.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import {
  COMPUTER_DIFFICULTY,
  COMPUTER_DIFFICULTY_LABEL,
  FORBIDDEN_REASON_LABEL,
  MATCH_TYPE,
  MATCH_TYPE_LABEL,
  OMOK_BOARD_SIZE,
  OMOK_MODE,
  OMOK_MODE_LABEL,
  OMOK_RESULT_REASON,
  PLAYER_STONE_CHOICE,
  PLAYER_STONE_CHOICE_LABEL,
  STONE,
} from "./omok.constants.js";
import { useOmokGame } from "./useOmokGame.js";
import { createOmokMatchConfig, isSamePosition, pointToPercent, positionKey } from "./omok.utils.js";

const DEFAULT_GAME_META = {
  eyebrow: "BOARD / 1 VS 1",
  title: "오목",
  description: "로컬 대국과 컴퓨터 대전을 지원하는 15x15 보드 게임입니다.",
};

const VIEW = {
  LOBBY: "lobby",
  GAME: "game",
};

const DIALOG = {
  SETTINGS: "settings",
  RESIGN: "resign",
};

const STAR_POINTS = [
  [3, 3],
  [11, 3],
  [7, 7],
  [3, 11],
  [11, 11],
];

const DEFAULT_SETTINGS = Object.freeze({
  computerDifficulty: COMPUTER_DIFFICULTY.NORMAL,
  explainForbiddenReasons: true,
  gameMode: OMOK_MODE.STANDARD,
  playerStoneChoice: PLAYER_STONE_CHOICE.RANDOM,
  showForbiddenPositions: true,
});

const GAME_MODE_OPTIONS = Object.values(OMOK_MODE);
const DIFFICULTY_OPTIONS = Object.values(COMPUTER_DIFFICULTY);
const PLAYER_STONE_OPTIONS = Object.values(PLAYER_STONE_CHOICE);

function getStoneLabel(stone) {
  return stone === STONE.BLACK ? "흑" : "백";
}

function getResultCopy({ activeMatch, draw, resultReason, winner }) {
  if (draw) {
    return {
      title: "무승부",
      description: "더 둘 수 있는 교차점이 없습니다.",
    };
  }

  if (!winner) return null;

  const winnerLabel = getStoneLabel(winner);

  if (activeMatch.matchType === MATCH_TYPE.COMPUTER) {
    const playerWon = winner === activeMatch.playerStone;
    return {
      title: playerWon ? "승리!" : "패배",
      description: resultReason === OMOK_RESULT_REASON.RESIGN
        ? "기권으로 대국이 종료되었습니다."
        : `${winnerLabel}이 다섯 돌을 완성했습니다.`,
    };
  }

  return {
    title: `${winnerLabel} 승리`,
    description: resultReason === OMOK_RESULT_REASON.RESIGN
      ? "기권으로 대국이 종료되었습니다."
      : `${winnerLabel}이 다섯 돌을 완성했습니다.`,
  };
}

export function OmokGame({ game = DEFAULT_GAME_META }) {
  const [view, setView] = useState(VIEW.LOBBY);
  const [dialog, setDialog] = useState(null);
  const [nickname, setNickname] = useState("guest");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeMatch, setActiveMatch] = useState(() => createOmokMatchConfig(MATCH_TYPE.LOCAL, DEFAULT_SETTINGS));
  const [matchKey, setMatchKey] = useState(0);

  const {
    board,
    turn,
    lastMove,
    winner,
    winningLine,
    moveCount,
    draw,
    resultReason,
    forbiddenFeedback,
    forbiddenPositionKeys,
    isComputerThinking,
    playUserMove,
    resign,
    restartGame,
  } = useOmokGame({
    computerDifficulty: activeMatch.computerDifficulty,
    computerStone: activeMatch.computerStone,
    explainForbiddenReasons: activeMatch.explainForbiddenReasons,
    gameMode: activeMatch.gameMode,
    isActive: view === VIEW.GAME,
    resetKey: matchKey,
    showForbiddenPositions: activeMatch.showForbiddenPositions,
  });

  const resultCopy = getResultCopy({ activeMatch, draw, resultReason, winner });
  const settingsLocked = view === VIEW.GAME;
  const showComputerSettings = !settingsLocked || activeMatch.matchType === MATCH_TYPE.COMPUTER;
  const activeForbiddenMessage = forbiddenFeedback && activeMatch.explainForbiddenReasons
    ? FORBIDDEN_REASON_LABEL[forbiddenFeedback.reason]
    : null;

  function openDialog(nextDialog) {
    setDialog(nextDialog);
  }

  function closeDialog() {
    setDialog(null);
  }

  function startMatch(matchType) {
    setActiveMatch(createOmokMatchConfig(matchType, settings));
    setDialog(null);
    setView(VIEW.GAME);
    setMatchKey((key) => key + 1);
  }

  function showLobby() {
    restartGame();
    setDialog(null);
    setView(VIEW.LOBBY);
  }

  function restartMatch() {
    setActiveMatch(createOmokMatchConfig(activeMatch.matchType, settings));
    setDialog(null);
    setMatchKey((key) => key + 1);
  }

  function updateSetting(key, value) {
    if (settingsLocked) return;
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function getPlayerName(stone) {
    if (activeMatch.matchType === MATCH_TYPE.LOCAL) {
      return stone === STONE.BLACK ? `${nickname || "Player"} (흑)` : "Player 2 (백)";
    }

    return stone === activeMatch.playerStone
      ? `${nickname || "Player"} (${getStoneLabel(stone)})`
      : `Computer (${getStoneLabel(stone)})`;
  }

  function getPlayerStatus(stone) {
    if (winner || draw) return "완료";
    if (turn !== stone) return "대기";
    if (activeMatch.computerStone === stone && isComputerThinking) return "생각 중";
    return "차례";
  }

  function getIntersectionLabel(position, cell, isForbidden) {
    const base = `${position.row + 1}행 ${position.col + 1}열`;
    if (cell) return `${base}, ${getStoneLabel(cell)}돌`;
    if (isForbidden) return `${base}, 금수 자리`;
    return `${base}, 빈 교차점`;
  }

  function confirmResign() {
    const resigningStone = activeMatch.computerStone && activeMatch.computerStone === turn
      ? activeMatch.playerStone
      : turn;

    resign(resigningStone);
    closeDialog();
  }

  const sidebar = (
    <>
      <div>
        <label className="f-label" htmlFor="omok-nickname">Nickname</label>
        <input
          className="txt"
          id="omok-nickname"
          type="text"
          value={nickname}
          maxLength="12"
          onChange={(event) => setNickname(event.target.value)}
        />
        <p className="game-stage__side-note">로그인 전에는 대국에서 사용할 이름만 이 화면에서 입력합니다.</p>
      </div>
      <div className="stat-row">
        <div className="stat"><div className="l">Board</div><div className="v">{OMOK_BOARD_SIZE}<small>x{OMOK_BOARD_SIZE}</small></div></div>
        <div className="stat"><div className="l">Mode</div><div className="v"><small>{MATCH_TYPE_LABEL[activeMatch.matchType]}</small></div></div>
        <div className="stat"><div className="l">Turn</div><div className="v"><small>{getStoneLabel(turn)}</small></div></div>
        <div className="stat"><div className="l">Moves</div><div className="v">{moveCount}</div></div>
      </div>
      {view === VIEW.GAME ? (
        <div className="game-stage__actions">
          <Button type="button" variant="secondary" onClick={() => openDialog(DIALOG.RESIGN)} disabled={Boolean(winner || draw)}>기권</Button>
          <Button type="button" variant="secondary" onClick={() => openDialog(DIALOG.SETTINGS)}>설정</Button>
          <Button type="button" variant="secondary" onClick={showLobby}>메뉴</Button>
        </div>
      ) : null}
      <p className="game-stage__side-note">{OMOK_MODE_LABEL[activeMatch.gameMode]} · {activeMatch.showForbiddenPositions ? "금수 미리보기 켜짐" : "금수 미리보기 꺼짐"}</p>
    </>
  );

  return (
    <GameStage
      className="omok-game"
      eyebrow={game.eyebrow}
      title={game.title}
      description={game.description}
      sidebar={sidebar}
      fullscreenEnabled
      ariaLabel={game.title}
    >
      <div className="omok-game__content">
        {view === VIEW.LOBBY ? (
          <div className="omok-game__lobby" aria-label="오목 메뉴">
            <div>
              <div className="kicker">Game menu</div>
              <h3 className="omok-game__section-title">어떻게 대국할까요?</h3>
            </div>
            <div className="omok-game__menu-grid">
              <button className="omok-game__menu-option" type="button" onClick={() => startMatch(MATCH_TYPE.LOCAL)}>
                <span className="omok-game__menu-title">로컬 2인 <span className="badge coral">Ready</span></span>
                <span className="omok-game__menu-desc">같은 화면에서 흑과 백이 번갈아 두기</span>
              </button>
              <button className="omok-game__menu-option" type="button" onClick={() => startMatch(MATCH_TYPE.COMPUTER)}>
                <span className="omok-game__menu-title">컴퓨터 대전 <span className="badge coral">AI</span></span>
                <span className="omok-game__menu-desc">난이도와 내 돌을 선택해 혼자 대국</span>
              </button>
              <button className="omok-game__menu-option" type="button" disabled>
                <span className="omok-game__menu-title">방 만들기 <span className="badge">Soon</span></span>
                <span className="omok-game__menu-desc">초대 링크와 온라인 동기화는 이번 PR 범위에서 제외</span>
              </button>
              <button className="omok-game__menu-option" type="button" disabled>
                <span className="omok-game__menu-title">랜덤 매칭 <span className="badge">Soon</span></span>
                <span className="omok-game__menu-desc">온라인 상대 매칭은 아직 연결하지 않았습니다</span>
              </button>
              <button className="omok-game__menu-option" type="button" onClick={() => openDialog(DIALOG.SETTINGS)}>
                <span className="omok-game__menu-title">게임 설정 <span className="badge">Config</span></span>
                <span className="omok-game__menu-desc">일반/자유 오목, 금수 안내, 컴퓨터 난이도</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="omok-game__turns" aria-label="대국자 정보">
              <div className={`omok-game__player${turn === STONE.BLACK && !winner && !draw ? " is-active" : ""}`}>
                <span className="omok-game__dot is-black" aria-hidden="true" />
                <div>
                  <div className="omok-game__player-name">{getPlayerName(STONE.BLACK)}</div>
                  <div className="omok-game__player-status">{getPlayerStatus(STONE.BLACK)}</div>
                </div>
              </div>
              <span className="omok-game__vs">vs</span>
              <div className={`omok-game__player${turn === STONE.WHITE && !winner && !draw ? " is-active" : ""}`}>
                <span className="omok-game__dot is-white" aria-hidden="true" />
                <div>
                  <div className="omok-game__player-name">{getPlayerName(STONE.WHITE)}</div>
                  <div className="omok-game__player-status">{getPlayerStatus(STONE.WHITE)}</div>
                </div>
              </div>
            </div>
            <div className="omok-game__board-wrap">
              <div className="omok-game__board" role="group" aria-label={`${OMOK_BOARD_SIZE}x${OMOK_BOARD_SIZE} 오목 보드`}>
                <span className="omok-game__grid" aria-hidden="true" />
                {STAR_POINTS.map(([column, row]) => (
                  <span
                    className="omok-game__star"
                    style={{ left: pointToPercent(column), top: pointToPercent(row) }}
                    key={`${column}-${row}`}
                    aria-hidden="true"
                  />
                ))}
                {board.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const position = { row: rowIndex, col: colIndex };
                    const key = positionKey(position);
                    const isForbidden = forbiddenPositionKeys.has(key);
                    const isRejected = isSamePosition(forbiddenFeedback?.position ?? null, position);
                    const isWinning = winningLine.some((item) => isSamePosition(item, position));
                    const isLast = isSamePosition(lastMove, position);
                    const isDisabled = Boolean(cell || winner || draw || isComputerThinking);

                    return (
                      <button
                        className={`omok-game__intersection${isForbidden ? " is-forbidden" : ""}${isRejected ? " is-rejected" : ""}`}
                        type="button"
                        style={{ left: pointToPercent(colIndex), top: pointToPercent(rowIndex) }}
                        key={key}
                        disabled={isDisabled}
                        aria-disabled={isForbidden || isDisabled ? "true" : undefined}
                        aria-label={getIntersectionLabel(position, cell, isForbidden)}
                        onClick={() => playUserMove(position)}
                      >
                        {cell ? (
                          <span
                            className={`omok-game__stone is-${cell}${isLast ? " is-last" : ""}${isWinning ? " is-winning" : ""}`}
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
            <p className="omok-game__hint">{isComputerThinking ? "컴퓨터가 두는 중입니다." : `${getStoneLabel(turn)} 차례입니다.`}</p>
            {activeForbiddenMessage ? <p className="omok-game__hint" role="status">{activeForbiddenMessage}</p> : null}
          </>
        )}
      </div>
      {dialog || resultCopy ? (
        <GameStageOverlay className="omok-game__overlay-layer" state={dialog ?? "result"}>
          {dialog === DIALOG.SETTINGS ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-settings-title">
              <p className="omok-game__modal-eyebrow">Config</p>
              <h3 id="omok-settings-title">게임 설정</h3>
              {settingsLocked ? <p>설정 변경은 다음 대국부터 적용됩니다.</p> : null}
              <div className="omok-game__settings" role="group" aria-label="오목 규칙">
                {GAME_MODE_OPTIONS.map((mode) => (
                  <button
                    className={`omok-game__setting-chip${settings.gameMode === mode ? " is-selected" : ""}`}
                    type="button"
                    disabled={settingsLocked}
                    key={mode}
                    onClick={() => updateSetting("gameMode", mode)}
                  >
                    {OMOK_MODE_LABEL[mode]}
                  </button>
                ))}
              </div>
              <div className="omok-game__settings omok-game__settings--toggles">
                <label>
                  금수 자리 미리보기
                  <input
                    type="checkbox"
                    checked={settings.showForbiddenPositions}
                    disabled={settingsLocked || settings.gameMode === OMOK_MODE.FREE}
                    onChange={(event) => updateSetting("showForbiddenPositions", event.target.checked)}
                  />
                </label>
                <label>
                  금수 이유 안내
                  <input
                    type="checkbox"
                    checked={settings.explainForbiddenReasons}
                    disabled={settingsLocked || settings.gameMode === OMOK_MODE.FREE}
                    onChange={(event) => updateSetting("explainForbiddenReasons", event.target.checked)}
                  />
                </label>
              </div>
              {showComputerSettings ? (
                <>
                  <div className="omok-game__settings" role="group" aria-label="컴퓨터 난이도">
                    {DIFFICULTY_OPTIONS.map((difficulty) => (
                      <button
                        className={`omok-game__setting-chip${settings.computerDifficulty === difficulty ? " is-selected" : ""}`}
                        type="button"
                        disabled={settingsLocked}
                        key={difficulty}
                        onClick={() => updateSetting("computerDifficulty", difficulty)}
                      >
                        {COMPUTER_DIFFICULTY_LABEL[difficulty]}
                      </button>
                    ))}
                  </div>
                  <div className="omok-game__settings" role="group" aria-label="내 돌 선택">
                    {PLAYER_STONE_OPTIONS.map((choice) => (
                      <button
                        className={`omok-game__setting-chip${settings.playerStoneChoice === choice ? " is-selected" : ""}`}
                        type="button"
                        disabled={settingsLocked}
                        key={choice}
                        onClick={() => updateSetting("playerStoneChoice", choice)}
                      >
                        {PLAYER_STONE_CHOICE_LABEL[choice]}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={closeDialog}>확인</Button>
                <Button type="button" variant="secondary" onClick={closeDialog}>닫기</Button>
              </div>
            </GameStageModal>
          ) : null}
          {dialog === DIALOG.RESIGN ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-resign-title">
              <p className="omok-game__modal-eyebrow">Confirm</p>
              <h3 id="omok-resign-title">기권할까요?</h3>
              <p>기권하면 이번 대국은 상대 승리로 종료됩니다.</p>
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={closeDialog}>계속 두기</Button>
                <Button type="button" variant="secondary" onClick={confirmResign}>기권하기</Button>
              </div>
            </GameStageModal>
          ) : null}
          {resultCopy && !dialog ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-result-title">
              <p className="omok-game__modal-eyebrow">Result</p>
              <h3 id="omok-result-title">{resultCopy.title}</h3>
              <p>{resultCopy.description}</p>
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={restartMatch}>다시 대국</Button>
                <Button type="button" variant="secondary" onClick={showLobby}>메뉴로</Button>
              </div>
            </GameStageModal>
          ) : null}
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
