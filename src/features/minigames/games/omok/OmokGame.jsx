import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import {
  COMPUTER_DIFFICULTY,
  COMPUTER_DIFFICULTY_LABEL,
  FORBIDDEN_REASON_LABEL,
  MATCH_TYPE,
  MATCH_TYPE_COMPACT_LABEL,
  MATCH_TYPE_LABEL,
  OMOK_BOARD_SIZE,
  OMOK_MODE,
  OMOK_MODE_COMPACT_LABEL,
  OMOK_MODE_LABEL,
  OMOK_RESULT_REASON,
  OMOK_RULE_DETAILS,
  PLAYER_STONE_CHOICE,
  PLAYER_STONE_CHOICE_LABEL,
  STONE,
} from "./omok.constants.js";
import { useOmokGame } from "./useOmokGame.js";
import { useOmokOnlineRoom } from "./useOmokOnlineRoom.js";
import {
  ONLINE_ACTION_STATUS,
  ONLINE_PLAYER_ROLE,
  ONLINE_ROLE_LABEL,
  ONLINE_ROOM_LOAD_STATUS,
  ONLINE_ROOM_STATUS,
} from "./online/omokOnline.constants.js";
import {
  GUEST_FALLBACK_NICKNAME,
  getNicknamePrefillForOnlineSetup,
  resolveSharedNickname,
  saveLocalSharedNickname,
  saveSharedNickname,
} from "./online/sharedNickname.js";
import { createOmokMatchConfig, isSamePosition, pointToPercent, positionKey } from "./omok.utils.js";

const DEFAULT_GAME_META = {
  eyebrow: "BOARD / 1 VS 1",
  title: "Omok",
  description: "온라인 대전과 컴퓨터 대전을 지원하는 15x15 보드 게임입니다.",
};

const SCREEN = {
  MENU: "menu",
  FRIEND_ROOM_CREATE: "friend-room-create",
  COMPUTER_SETUP: "computer-setup",
  GAME_START: "game-start",
  PLAYING: "playing",
};

const DIALOG = {
  NICKNAME: "nickname",
  ONLINE_ERROR: "online-error",
  SETTINGS: "settings",
  LEAVE_CONFIRM: "leave-confirm",
  RULES: "rules",
  START: "start",
};

const STAR_POINTS = [
  [3, 3],
  [11, 3],
  [7, 7],
  [3, 11],
  [11, 11],
];

const DEFAULT_SETTINGS = Object.freeze({
  allowForbiddenPositions: true,
  allowForbiddenReasons: true,
  computerDifficulty: COMPUTER_DIFFICULTY.NORMAL,
  explainForbiddenReasons: true,
  gameMode: OMOK_MODE.STANDARD,
  playerStoneChoice: PLAYER_STONE_CHOICE.RANDOM,
  showForbiddenPositions: true,
});

const GAME_MODE_OPTIONS = Object.values(OMOK_MODE);
const DIFFICULTY_OPTIONS = Object.values(COMPUTER_DIFFICULTY);
const PLAYER_STONE_OPTIONS = Object.values(PLAYER_STONE_CHOICE);

function OmokSettingToggle({ checked, disabled = false, label, onChange }) {
  return (
    <button
      aria-pressed={checked}
      className={`omok-game__setting-toggle${checked ? " is-on" : ""}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span>{label}</span>
      <strong>{checked ? "ON" : "OFF"}</strong>
    </button>
  );
}

function getStoneLabel(stone) {
  return stone === STONE.BLACK ? "흑" : "백";
}

function getEnabledLabel(enabled) {
  return enabled ? "켜짐" : "꺼짐";
}

function getAllowedLabel(allowed) {
  return allowed ? "허용" : "허용 안 함";
}

function getCompactRuleSummaryText({ explainForbiddenReasons, gameMode, showForbiddenPositions }) {
  const hasGuide = gameMode === OMOK_MODE.STANDARD && (showForbiddenPositions || explainForbiddenReasons);
  return `${OMOK_MODE_LABEL[gameMode]} · ${hasGuide ? "금수 도움 사용 중" : "금수 도움 사용 안 함"}`;
}

function getRoomRuleSummaryText(room) {
  return `${OMOK_MODE_LABEL[room.gameMode]} · 금수 위치 보기 ${getAllowedLabel(room.allowForbiddenPositions)} · 금수 이유 설명 ${getAllowedLabel(room.allowForbiddenReasons)}`;
}

function getPlayerGuideSummaryText(player) {
  return `금수 위치 표시 ${getEnabledLabel(player.showForbiddenPositions)} · 금수 이유 설명 ${getEnabledLabel(player.explainForbiddenReasons)}`;
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

function getOnlineResultCopy({ draw, playerStone, resultReason, winner }) {
  if (draw) {
    return {
      title: "무승부",
      description: "더 둘 수 있는 교차점이 없습니다.",
    };
  }

  if (!winner) return null;

  const playerWon = winner === playerStone;
  return {
    title: playerWon ? "승리!" : "패배",
    description: resultReason === OMOK_RESULT_REASON.RESIGN
      ? "기권으로 대국이 종료되었습니다."
      : `${getStoneLabel(winner)}이 다섯 돌을 완성했습니다.`,
  };
}

function getPlayerByRole(room, role) {
  return room?.players?.find((player) => player.role === role) ?? null;
}

export function OmokGame({ game = DEFAULT_GAME_META, roomId = null }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const resultSoundRef = useRef(null);
  const [screen, setScreen] = useState(SCREEN.MENU);
  const [dialog, setDialog] = useState(null);
  const [sharedNickname, setSharedNickname] = useState(GUEST_FALLBACK_NICKNAME);
  const [onlineNickname, setOnlineNickname] = useState("");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeMatch, setActiveMatch] = useState(() => createOmokMatchConfig(MATCH_TYPE.COMPUTER, DEFAULT_SETTINGS));
  const [matchKey, setMatchKey] = useState(0);
  const [startedOnlineRound, setStartedOnlineRound] = useState(null);
  const online = useOmokOnlineRoom({
    onNavigateToLobby: () => navigate("/minigames/omok"),
    onNavigateToRoom: (nextRoomId) => navigate(`/minigames/omok/room/${encodeURIComponent(nextRoomId)}`),
    roomId,
  });

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
    restartGame,
  } = useOmokGame({
    computerDifficulty: activeMatch.computerDifficulty,
    computerStone: activeMatch.computerStone,
    explainForbiddenReasons: activeMatch.explainForbiddenReasons,
    gameMode: activeMatch.gameMode,
    isActive: screen === SCREEN.PLAYING && !online.room,
    resetKey: matchKey,
    showForbiddenPositions: activeMatch.showForbiddenPositions,
  });

  const isOnlineContext = Boolean(online.room || roomId || online.needsNicknameSetup || online.status === ONLINE_ROOM_LOAD_STATUS.ERROR);
  const isOnlineWaiting = online.room?.status === ONLINE_ROOM_STATUS.WAITING;
  const isOnlinePlaying = online.room?.status === ONLINE_ROOM_STATUS.PLAYING;
  const needsOnlineStart = Boolean(isOnlinePlaying && startedOnlineRound !== online.room.currentRound);
  const onlineGame = online.derivedGame;
  const activeBoard = isOnlinePlaying ? onlineGame.board : board;
  const activeTurn = isOnlinePlaying ? onlineGame.turn : turn;
  const activeLastMove = isOnlinePlaying ? onlineGame.lastMove : lastMove;
  const activeWinner = isOnlinePlaying ? onlineGame.winner : winner;
  const activeWinningLine = isOnlinePlaying ? onlineGame.winningLine : winningLine;
  const activeMoveCount = isOnlinePlaying ? onlineGame.moveCount : moveCount;
  const activeDraw = isOnlinePlaying ? onlineGame.draw : draw;
  const activeForbiddenPositionKeys = isOnlinePlaying ? online.forbiddenPositionKeys : forbiddenPositionKeys;
  const activeMatchType = isOnlineContext ? MATCH_TYPE.ONLINE : activeMatch.matchType;
  const isGameScreenVisible = isOnlinePlaying || screen === SCREEN.GAME_START || screen === SCREEN.PLAYING;
  const canEditSidebarNickname = !isOnlineContext && !isGameScreenVisible;
  const sidebarNickname = isOnlineContext
    ? (online.currentPlayer?.nickname ?? online.profileNickname ?? GUEST_FALLBACK_NICKNAME)
    : sharedNickname;
  const nicknameHelpText = isOnlineContext
    ? "온라인 대기실과 대국 중에는 닉네임을 변경할 수 없어요."
    : isGameScreenVisible
      ? "대국 중에는 닉네임을 변경할 수 없어요."
      : "대국 전에 사용할 이름을 입력하세요.";
  const activeGameMode = online.room?.gameMode ?? activeMatch.gameMode;
  const currentGuideSettings = {
    explainForbiddenReasons: online.currentPlayer?.explainForbiddenReasons ?? settings.explainForbiddenReasons,
    showForbiddenPositions: online.currentPlayer?.showForbiddenPositions ?? settings.showForbiddenPositions,
  };
  const resultCopy = isOnlinePlaying
    ? getOnlineResultCopy({
      draw: activeDraw,
      playerStone: online.playerStone,
      resultReason: onlineGame.resultReason,
      winner: activeWinner,
    })
    : getResultCopy({ activeMatch, draw, resultReason, winner });
  const resultTitle = resultCopy?.title ?? null;
  const shouldCelebrateWinner = Boolean(activeWinner && (
    isOnlinePlaying
      ? activeWinner === online.playerStone
      : activeMatch.matchType === MATCH_TYPE.COMPUTER
        ? activeWinner === activeMatch.playerStone
        : true
  ));
  const activeForbiddenMessage = !isOnlinePlaying && forbiddenFeedback && activeMatch.explainForbiddenReasons
    ? FORBIDDEN_REASON_LABEL[forbiddenFeedback.reason]
    : null;
  const onlineBusy = online.actionStatus !== ONLINE_ACTION_STATUS.IDLE;
  const hasActiveOnlineGame = isOnlinePlaying && !activeWinner && !activeDraw;
  const hasActiveComputerGame = screen === SCREEN.PLAYING && !isOnlineContext && activeMoveCount > 0 && !activeWinner && !activeDraw;
  const compactRuleSummaryText = isOnlineContext && online.room
    ? getCompactRuleSummaryText({
      explainForbiddenReasons: online.effectiveExplainForbiddenReasons,
      gameMode: online.room.gameMode,
      showForbiddenPositions: online.effectiveShowForbiddenPositions,
    })
    : getCompactRuleSummaryText({
      explainForbiddenReasons: activeMatch.explainForbiddenReasons,
      gameMode: activeMatch.gameMode,
      showForbiddenPositions: activeMatch.showForbiddenPositions,
    });

  useEffect(() => {
    if (!resultTitle) {
      resultSoundRef.current = null;
      return;
    }
    if (resultSoundRef.current === resultTitle) return;
    resultSoundRef.current = resultTitle;
    playSound(resultTitle.includes("승리") ? "clear" : "gameOver");
  }, [playSound, resultTitle]);

  useEffect(() => {
    let cancelled = false;

    resolveSharedNickname().then((resolved) => {
      if (!cancelled) setSharedNickname(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (online.needsNicknameSetup) {
      setDialog(DIALOG.NICKNAME);
      setOnlineNickname(getNicknamePrefillForOnlineSetup());
    } else {
      // A successful save flips needsNicknameSetup false - close the
      // nickname dialog exactly once instead of leaving it open on top of
      // the room flow it just unblocked.
      setDialog((current) => (current === DIALOG.NICKNAME ? null : current));
    }
  }, [online.needsNicknameSetup]);

  function openDialog(nextDialog) {
    setDialog(nextDialog);
  }

  function closeDialog() {
    setDialog(null);
  }

  function startComputerMatch() {
    setActiveMatch(createOmokMatchConfig(MATCH_TYPE.COMPUTER, settings));
    setScreen(SCREEN.GAME_START);
    setDialog(DIALOG.START);
    setMatchKey((key) => key + 1);
  }

  function createOnlineRoom() {
    setActiveMatch(createOmokMatchConfig(MATCH_TYPE.ONLINE, settings));
    setDialog(null);
    setScreen(SCREEN.MENU);
    online.createRoom({
      gameMode: settings.gameMode,
      guideSettings: {
        explainForbiddenReasons: settings.explainForbiddenReasons,
        showForbiddenPositions: settings.showForbiddenPositions,
      },
      roomGuideSettings: {
        allowForbiddenPositions: settings.allowForbiddenPositions,
        allowForbiddenReasons: settings.allowForbiddenReasons,
      },
    });
  }

  function showLobby() {
    restartGame();
    setDialog(null);
    setScreen(SCREEN.MENU);
  }

  function restartMatch() {
    setActiveMatch(createOmokMatchConfig(activeMatch.matchType, settings));
    setScreen(SCREEN.GAME_START);
    setDialog(DIALOG.START);
    setMatchKey((key) => key + 1);
  }

  function completeStart() {
    playSound("countdownFinal");
    if (isOnlineContext) setStartedOnlineRound(online.room?.currentRound ?? null);
    else setScreen(SCREEN.PLAYING);
    closeDialog();
  }

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateGuideSetting(key, value) {
    if (isOnlineContext && online.room) {
      online.setGuidePreferences({
        ...currentGuideSettings,
        [key]: value,
      });
      return;
    }

    updateSetting(key, value);
  }

  function updateOnlineRoomSetting(key, value) {
    if (!online.room) return;
    online.updateRoomSettings({
      allowForbiddenPositions: online.room.allowForbiddenPositions,
      allowForbiddenReasons: online.room.allowForbiddenReasons,
      gameMode: online.room.gameMode,
      [key]: value,
    });
  }

  function requestLeaveOnlineRoom() {
    if (hasActiveOnlineGame) {
      openDialog(DIALOG.LEAVE_CONFIRM);
      return;
    }
    online.leaveRoom();
  }

  function requestReturnToMenu() {
    if (hasActiveComputerGame) {
      openDialog(DIALOG.LEAVE_CONFIRM);
      return;
    }
    showLobby();
  }

  function confirmLeave() {
    closeDialog();
    if (isOnlineContext) {
      online.leaveRoom();
      return;
    }
    showLobby();
  }

  function getPlayerName(stone) {
    if (isOnlineContext && online.room) {
      const role = stone === STONE.BLACK ? ONLINE_PLAYER_ROLE.HOST : ONLINE_PLAYER_ROLE.GUEST;
      const player = getPlayerByRole(online.room, role);
      if (!player) return stone === STONE.BLACK ? "Host (흑)" : "Guest (백)";
      const me = player.userId === online.currentUserId ? " · me" : "";
      return `${player.nickname}${me} (${getStoneLabel(stone)})`;
    }

    return stone === activeMatch.playerStone
      ? `${sharedNickname || "Player"} (${getStoneLabel(stone)})`
      : `Computer (${getStoneLabel(stone)})`;
  }

  function getPlayerStatus(stone) {
    if (isOnlinePlaying) {
      if (online.opponentLeft && online.playerStone !== stone) return "상대 나감";
      if (activeWinner || activeDraw) return "완료";
      if (activeTurn !== stone) return "대기";
      return online.playerStone === stone ? "내 차례" : "상대 차례";
    }

    if (activeWinner || activeDraw) return "완료";
    if (activeTurn !== stone) return "대기";
    if (activeMatch.computerStone === stone && isComputerThinking) return "생각 중";
    return "차례";
  }

  function getIntersectionLabel(position, cell, isForbidden) {
    const base = `${position.row + 1}행 ${position.col + 1}열`;
    if (cell) return `${base}, ${getStoneLabel(cell)}돌`;
    if (isForbidden) return `${base}, 금수 자리`;
    return `${base}, 빈 교차점`;
  }

  function saveOnlineNickname() {
    try {
      const normalized = saveLocalSharedNickname(onlineNickname);
      setSharedNickname(normalized);
    } catch {
      // Validation errors surface via online.saveNicknameAndResume's own error state below.
    }

    online.saveNicknameAndResume(onlineNickname);
  }

  function closeOnlineError() {
    online.resetRoom();
    closeDialog();
  }

  function handleIntersectionClick(position) {
    playSound("move");
    if (isOnlinePlaying) {
      online.submitMove(position);
      return;
    }

    playUserMove(position);
  }

  function getIntersectionDisabled(cell) {
    if (dialog === DIALOG.START || needsOnlineStart) return true;
    if (isOnlinePlaying) {
      return Boolean(cell || activeWinner || activeDraw || !online.canSubmitMove || online.opponentLeft);
    }

    return Boolean(cell || activeWinner || activeDraw || isComputerThinking);
  }

  function handleOnlineRematchClick() {
    if (online.room?.roundRequestedBy && online.room.roundRequestedBy !== online.currentUserId) {
      online.acceptRematch();
      return;
    }
    if (online.room?.roundRequestedBy === online.currentUserId) return;
    online.requestRematch();
  }

  const sidebar = (
    <>
      <div>
        <label className="f-label" htmlFor="omok-nickname">Nickname</label>
        <input
          className="txt"
          id="omok-nickname"
          type="text"
          value={sidebarNickname}
          maxLength="12"
          readOnly={!canEditSidebarNickname}
          aria-readonly={!canEditSidebarNickname}
          onChange={(event) => {
            if (canEditSidebarNickname) setSharedNickname(event.target.value);
          }}
          onBlur={() => {
            if (!canEditSidebarNickname) return;
            saveSharedNickname(sharedNickname).then(setSharedNickname).catch(() => {});
          }}
        />
        <p className="game-stage__side-note">{nicknameHelpText}</p>
      </div>
      <div className="stat-row">
        <div className="stat"><div className="l">Board</div><div className="v">{OMOK_BOARD_SIZE}<small>x{OMOK_BOARD_SIZE}</small></div></div>
        <div className="stat"><div className="l">Match</div><div className="v"><small aria-label={isGameScreenVisible ? MATCH_TYPE_LABEL[activeMatchType] : isOnlineContext ? "Friend room" : "선택 전"}>{isGameScreenVisible ? MATCH_TYPE_COMPACT_LABEL[activeMatchType] : isOnlineContext ? "FRIEND" : "—"}</small></div></div>
        {isGameScreenVisible ? (
          <>
            <div className="stat"><div className="l">Turn</div><div className="v"><small>{getStoneLabel(activeTurn)}</small></div></div>
            <div className="stat"><div className="l">Moves</div><div className="v">{activeMoveCount}</div></div>
          </>
        ) : (
          <>
            <div className="stat"><div className="l">Rule</div><div className="v"><small aria-label={OMOK_MODE_LABEL[activeGameMode]}>{OMOK_MODE_COMPACT_LABEL[activeGameMode]}</small></div></div>
            <div className="stat"><div className="l">Guide</div><div className="v"><small>{compactRuleSummaryText.includes("사용 중") ? "사용 중" : "사용 안 함"}</small></div></div>
          </>
        )}
      </div>
      <p className="game-stage__side-note omok-game__rule-summary">
        <span className="omok-game__rule-summary-text">
          <span>{OMOK_MODE_LABEL[activeGameMode]}</span>
          <span>{compactRuleSummaryText.includes("사용 중") ? "금수 도움 사용 중" : "금수 도움 사용 안 함"}</span>
        </span>
        <button
          type="button"
          className="omok-game__rule-info-button"
          aria-label="규칙 자세히 보기"
          onClick={() => openDialog(DIALOG.RULES)}
        >
          i
        </button>
      </p>
    </>
  );

  const hostPlayer = getPlayerByRole(online.room, ONLINE_PLAYER_ROLE.HOST);
  const guestPlayer = getPlayerByRole(online.room, ONLINE_PLAYER_ROLE.GUEST);
  const isOnlineHost = online.currentPlayer?.role === ONLINE_PLAYER_ROLE.HOST;
  const canStartOnlineRoom = Boolean(
    isOnlineHost &&
    online.room?.players?.length === 2 &&
    online.room.players.every((player) => player.ready) &&
    !onlineBusy,
  );
  const onlineRoomCode = online.room?.id ? online.room.id.slice(0, 8).toUpperCase() : "";
  const rematchRequestedByMe = Boolean(online.room?.roundRequestedBy && online.room.roundRequestedBy === online.currentUserId);
  const rematchRequestedByOpponent = Boolean(online.room?.roundRequestedBy && online.room.roundRequestedBy !== online.currentUserId);
  const onlineDeriveWarning = isOnlinePlaying && !onlineGame.valid ? onlineGame.errorMessage : null;
  const showOnlineBlockingOverlay = (
    online.needsNicknameSetup ||
    (online.status === ONLINE_ROOM_LOAD_STATUS.ERROR && !online.room) ||
    online.status === ONLINE_ROOM_LOAD_STATUS.CHECKING_PROFILE
  );
  const canDismissDialog = dialog === DIALOG.SETTINGS || dialog === DIALOG.RULES;

  function requestGameExit() {
    if (isOnlineContext && online.room) {
      requestLeaveOnlineRoom();
      return;
    }
    if (screen === SCREEN.GAME_START || screen === SCREEN.PLAYING) {
      requestReturnToMenu();
      return;
    }
    navigate("/");
  }

  const topbarActions = (
    <Button
      type="button"
      variant="secondary"
      onClick={requestGameExit}
    >
      게임 나가기
    </Button>
  );

  return (
    <GameStage
      actions={topbarActions}
      className={`omok-game${isGameScreenVisible ? " is-game-screen" : ""}`}
      eyebrow={game.eyebrow}
      title={game.title}
      description={game.description}
      isExitConfirmationOpen={dialog === DIALOG.LEAVE_CONFIRM}
      onRequestExit={requestGameExit}
      sidebar={sidebar}
      ariaLabel={game.title}
    >
      <div className="omok-game__content">
        {online.status === ONLINE_ROOM_LOAD_STATUS.CHECKING_PROFILE ? (
          <div className="omok-game__lobby" role="status">
            <div className="kicker">Online room</div>
            <h3 className="omok-game__section-title">온라인 방을 준비하는 중입니다</h3>
            <p className="omok-game__hint">익명 세션과 닉네임 정보를 확인하고 있어요.</p>
          </div>
        ) : null}
        {isOnlineWaiting ? (
          <div className="omok-game__lobby omok-game__waiting-room" aria-label="오목 온라인 대기실">
            <div>
              <div className="kicker">Online room · {onlineRoomCode}</div>
              <h3 className="omok-game__section-title">{online.room.title}</h3>
              <p className="omok-game__hint">Host는 흑, Guest는 백입니다.</p>
            </div>
            {online.errorMessage ? <p className="omok-game__notice is-error" role="alert">{online.errorMessage}</p> : null}
            {online.syncWarning ? <p className="omok-game__notice" role="status">{online.syncWarning}</p> : null}
            <div className="omok-game__invite">
              <label className="f-label" htmlFor="omok-invite-url">Invite URL</label>
              <div className="omok-game__invite-row">
                <input className="txt" id="omok-invite-url" type="text" value={online.inviteUrl} readOnly />
                <Button type="button" variant="secondary" onClick={online.copyInviteUrl} disabled={!online.inviteUrl}>
                  {online.copied ? "복사됨" : "복사"}
                </Button>
              </div>
              <span className="visually-hidden" role="status">{online.copied ? "초대 링크가 복사되었습니다." : ""}</span>
            </div>
            <div className="omok-game__room-slots">
              {[hostPlayer, guestPlayer].map((player, index) => {
                const role = index === 0 ? ONLINE_PLAYER_ROLE.HOST : ONLINE_PLAYER_ROLE.GUEST;
                return (
                  <div className="omok-game__room-slot" key={role}>
                    <span className={`omok-game__dot ${role === ONLINE_PLAYER_ROLE.HOST ? "is-black" : "is-white"}`} aria-hidden="true" />
                    <div>
                      <div className="omok-game__player-name">
                        {player ? `${player.nickname}${player.userId === online.currentUserId ? " · me" : ""}` : "Waiting"}
                      </div>
                      <div className="omok-game__player-status">
                        {ONLINE_ROLE_LABEL[role]} · {player ? (player.ready ? "Ready" : "Not ready") : "Empty"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="omok-game__rule-panel" aria-label="공유 방 규칙">
              <div className="omok-game__rule-panel-header">
                <span className="omok-game__player-guide-role">공유 방 규칙</span>
                <button
                  type="button"
                  className="omok-game__rule-info-button"
                  aria-label="규칙 자세히 보기"
                  onClick={() => openDialog(DIALOG.RULES)}
                >
                  i
                </button>
              </div>
              <p className="omok-game__hint">{getRoomRuleSummaryText(online.room)}</p>
              {isOnlineHost ? (
                <>
                  <div className="omok-game__settings" role="group" aria-label="오목 규칙">
                    {GAME_MODE_OPTIONS.map((mode) => (
                      <button
                        className={`omok-game__setting-chip${online.room.gameMode === mode ? " is-selected" : ""}`}
                        type="button"
                        disabled={onlineBusy}
                        key={mode}
                        onClick={() => updateOnlineRoomSetting("gameMode", mode)}
                      >
                        {OMOK_MODE_LABEL[mode]}
                      </button>
                    ))}
                  </div>
                  {online.room.gameMode === OMOK_MODE.STANDARD ? (
                    <div className="omok-game__settings omok-game__settings--toggles">
                      <OmokSettingToggle checked={online.room.allowForbiddenPositions} disabled={onlineBusy} label="금수 위치 허용" onChange={(value) => updateOnlineRoomSetting("allowForbiddenPositions", value)} />
                      <OmokSettingToggle checked={online.room.allowForbiddenReasons} disabled={onlineBusy} label="금수 이유 허용" onChange={(value) => updateOnlineRoomSetting("allowForbiddenReasons", value)} />
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
            <div className="omok-game__rule-panel" aria-label="플레이어 금수 안내 설정">
              <span className="omok-game__player-guide-role">플레이어 금수 안내</span>
              {[hostPlayer, guestPlayer].map((player, index) => {
                const role = index === 0 ? ONLINE_PLAYER_ROLE.HOST : ONLINE_PLAYER_ROLE.GUEST;
                const isMe = Boolean(player && player.userId === online.currentUserId);
                return (
                  <div className="omok-game__player-guide-row" key={role}>
                    <span className="omok-game__player-guide-role">{ONLINE_ROLE_LABEL[role]}</span>
                    {!player ? (
                      <p className="omok-game__hint">입장 대기 중</p>
                    ) : isMe ? (
                      online.room.gameMode === OMOK_MODE.STANDARD ? (
                        <div className="omok-game__settings omok-game__settings--toggles">
                          <OmokSettingToggle checked={currentGuideSettings.showForbiddenPositions} disabled={onlineBusy} label="금수 위치" onChange={(value) => updateGuideSetting("showForbiddenPositions", value)} />
                          <OmokSettingToggle checked={currentGuideSettings.explainForbiddenReasons} disabled={onlineBusy} label="금수 이유" onChange={(value) => updateGuideSetting("explainForbiddenReasons", value)} />
                        </div>
                      ) : null
                    ) : (
                      <p className="omok-game__hint">{getPlayerGuideSummaryText(player)}</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="game-stage__actions omok-game__waiting-actions">
              <Button type="button" onClick={() => online.setReady(!online.currentPlayer?.ready)} disabled={!online.currentPlayer || onlineBusy}>
                {online.currentPlayer?.ready ? "준비 취소" : "준비"}
              </Button>
              {isOnlineHost ? (
                <Button type="button" variant="secondary" onClick={online.startRoom} disabled={!canStartOnlineRoom}>게임 시작</Button>
              ) : (
                <Button type="button" variant="secondary" aria-label="방장이 게임을 시작하기를 기다리는 중" disabled>시작 대기</Button>
              )}
              <Button type="button" variant="secondary" onClick={requestLeaveOnlineRoom} disabled={onlineBusy}>나가기</Button>
            </div>
          </div>
        ) : null}
        {!isOnlineContext && screen === SCREEN.MENU ? (
          <div className="omok-game__lobby" aria-label="오목 메뉴">
            <div>
              <div className="kicker">Game menu</div>
              <h3 className="omok-game__section-title">어떻게 대국할까요?</h3>
            </div>
            <div className="omok-game__menu-grid">
              <button className="omok-game__menu-option" type="button" disabled>
                <span className="omok-game__menu-title">빠른 대전 <span className="badge">준비 중</span></span>
                <span className="omok-game__menu-desc">온라인 상대를 자동으로 찾아 바로 대국해요.</span>
              </button>
              <button className="omok-game__menu-option" type="button" onClick={() => setScreen(SCREEN.FRIEND_ROOM_CREATE)} disabled={onlineBusy}>
                <span className="omok-game__menu-title">친구 초대 <span className="badge coral">Invite</span></span>
                <span className="omok-game__menu-desc">초대 링크를 보내 친구와 함께 대국해요.</span>
              </button>
              <button className="omok-game__menu-option" type="button" onClick={() => setScreen(SCREEN.COMPUTER_SETUP)}>
                <span className="omok-game__menu-title">컴퓨터 대전 <span className="badge coral">AI</span></span>
                <span className="omok-game__menu-desc">난이도와 내 돌을 선택해 혼자 대국</span>
              </button>
              <button className="omok-game__menu-option" type="button" onClick={() => openDialog(DIALOG.SETTINGS)}>
                <span className="omok-game__menu-title">게임 설정 <span className="badge">Config</span></span>
                <span className="omok-game__menu-desc">대국 전에 사용할 개인 금수 안내 기본값</span>
              </button>
            </div>
          </div>
        ) : null}
        {!isOnlineContext && screen === SCREEN.FRIEND_ROOM_CREATE ? (
          <div className="omok-game__lobby omok-game__setup" aria-label="친구 초대 방 만들기 설정">
            <div>
              <div className="kicker">Friend room</div>
              <h3 className="omok-game__section-title">방 만들기 설정</h3>
              <p className="omok-game__hint">친구와 함께 사용할 규칙을 정한 뒤 방을 만드세요.</p>
            </div>
            <div className="omok-game__settings" role="group" aria-label="방 오목 규칙">
              {GAME_MODE_OPTIONS.map((mode) => (
                <button className={`omok-game__setting-chip${settings.gameMode === mode ? " is-selected" : ""}`} type="button" key={mode} onClick={() => updateSetting("gameMode", mode)}>
                  {OMOK_MODE_LABEL[mode]}
                </button>
              ))}
            </div>
            {settings.gameMode === OMOK_MODE.STANDARD ? (
              <div className="omok-game__settings omok-game__settings--toggles">
                <OmokSettingToggle checked={settings.allowForbiddenPositions} label="금수 위치 허용" onChange={(value) => updateSetting("allowForbiddenPositions", value)} />
                <OmokSettingToggle checked={settings.allowForbiddenReasons} label="금수 이유 허용" onChange={(value) => updateSetting("allowForbiddenReasons", value)} />
              </div>
            ) : null}
            <div className="game-stage__actions omok-game__setup-actions">
              <Button type="button" onClick={createOnlineRoom} disabled={onlineBusy}>방 만들기</Button>
              <Button type="button" variant="secondary" onClick={() => setScreen(SCREEN.MENU)} disabled={onlineBusy}>뒤로</Button>
            </div>
          </div>
        ) : null}
        {!isOnlineContext && screen === SCREEN.COMPUTER_SETUP ? (
          <div className="omok-game__lobby omok-game__setup" aria-label="컴퓨터 대전 설정">
            <div>
              <div className="kicker">Computer match</div>
              <h3 className="omok-game__section-title">컴퓨터 대전 설정</h3>
            </div>
            <div className="omok-game__settings" role="group" aria-label="오목 규칙">
              {GAME_MODE_OPTIONS.map((mode) => <button className={`omok-game__setting-chip${settings.gameMode === mode ? " is-selected" : ""}`} type="button" key={mode} onClick={() => updateSetting("gameMode", mode)}>{OMOK_MODE_LABEL[mode]}</button>)}
            </div>
            <div className="omok-game__settings" role="group" aria-label="컴퓨터 난이도">
              {DIFFICULTY_OPTIONS.map((difficulty) => <button className={`omok-game__setting-chip${settings.computerDifficulty === difficulty ? " is-selected" : ""}`} type="button" key={difficulty} onClick={() => updateSetting("computerDifficulty", difficulty)}>{COMPUTER_DIFFICULTY_LABEL[difficulty]}</button>)}
            </div>
            <div className="omok-game__settings" role="group" aria-label="내 돌 선택">
              {PLAYER_STONE_OPTIONS.map((choice) => <button className={`omok-game__setting-chip${settings.playerStoneChoice === choice ? " is-selected" : ""}`} type="button" key={choice} onClick={() => updateSetting("playerStoneChoice", choice)}>{PLAYER_STONE_CHOICE_LABEL[choice]}</button>)}
            </div>
            {settings.gameMode === OMOK_MODE.STANDARD ? (
              <div className="omok-game__settings omok-game__settings--toggles">
                <OmokSettingToggle checked={settings.showForbiddenPositions} label="금수 위치" onChange={(value) => updateSetting("showForbiddenPositions", value)} />
                <OmokSettingToggle checked={settings.explainForbiddenReasons} label="금수 이유" onChange={(value) => updateSetting("explainForbiddenReasons", value)} />
              </div>
            ) : null}
            <div className="game-stage__actions omok-game__setup-actions">
              <Button type="button" onClick={startComputerMatch}>게임 시작</Button>
              <Button type="button" variant="secondary" onClick={() => setScreen(SCREEN.MENU)}>뒤로</Button>
            </div>
          </div>
        ) : null}
        {(!isOnlineContext && (screen === SCREEN.GAME_START || screen === SCREEN.PLAYING)) || isOnlinePlaying ? (
          <>
            <div className="omok-game__turns" aria-label="대국자 정보">
              <div className={`omok-game__player${activeTurn === STONE.BLACK && !activeWinner && !activeDraw ? " is-active" : ""}`}>
                <span className="omok-game__dot is-black" aria-hidden="true" />
                <div>
                  <div className="omok-game__player-name">{getPlayerName(STONE.BLACK)}</div>
                  <div className="omok-game__player-status">{getPlayerStatus(STONE.BLACK)}</div>
                </div>
              </div>
              <span className="omok-game__vs">vs</span>
              <div className={`omok-game__player${activeTurn === STONE.WHITE && !activeWinner && !activeDraw ? " is-active" : ""}`}>
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
                {activeBoard.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const position = { row: rowIndex, col: colIndex };
                    const key = positionKey(position);
                    const isForbidden = activeForbiddenPositionKeys.has(key);
                    const isRejected = !isOnlinePlaying && isSamePosition(forbiddenFeedback?.position ?? null, position);
                    const isWinning = activeWinningLine.some((item) => isSamePosition(item, position));
                    const isLast = isSamePosition(activeLastMove, position);
                    const isDisabled = getIntersectionDisabled(cell);

                    return (
                      <button
                        className={`omok-game__intersection${isForbidden ? " is-forbidden" : ""}${isRejected ? " is-rejected" : ""}`}
                        type="button"
                        style={{ left: pointToPercent(colIndex), top: pointToPercent(rowIndex) }}
                        key={key}
                        disabled={isDisabled}
                        aria-disabled={isForbidden || isDisabled ? "true" : undefined}
                        aria-label={getIntersectionLabel(position, cell, isForbidden)}
                        onClick={() => handleIntersectionClick(position)}
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
            <p className="omok-game__hint">
              {isOnlinePlaying && online.opponentLeft
                ? "상대가 방을 나갔습니다."
                : isOnlinePlaying && online.actionStatus === ONLINE_ACTION_STATUS.SUBMITTING_MOVE
                  ? "착수를 동기화하는 중입니다."
                  : isComputerThinking
                    ? "컴퓨터가 두는 중입니다."
                    : `${getStoneLabel(activeTurn)} 차례입니다.`}
            </p>
            {online.syncWarning ? <p className="omok-game__hint" role="status">{online.syncWarning}</p> : null}
            {onlineDeriveWarning ? <p className="omok-game__notice is-error" role="alert">{onlineDeriveWarning}</p> : null}
            {isOnlinePlaying && online.errorMessage ? <p className="omok-game__notice is-error" role="alert">{online.errorMessage}</p> : null}
            {activeForbiddenMessage ? <p className="omok-game__hint" role="status">{activeForbiddenMessage}</p> : null}
          </>
        ) : null}
      </div>
      {dialog || needsOnlineStart || resultCopy || showOnlineBlockingOverlay ? (
        <GameStageOverlay
          className="omok-game__overlay-layer"
          state={dialog ?? (needsOnlineStart ? DIALOG.START : "result")}
          closeOnBackdrop={canDismissDialog}
          closeOnEscape={canDismissDialog}
          onClose={canDismissDialog ? closeDialog : undefined}
        >
          {dialog === DIALOG.NICKNAME ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-online-nickname-title">
              <p className="omok-game__modal-eyebrow">Online</p>
              <h3 id="omok-online-nickname-title">온라인 닉네임</h3>
              <p>친구와 함께 볼 이름을 입력해 주세요.</p>
              <label className="f-label" htmlFor="omok-online-nickname">Nickname</label>
              <input
                className="txt"
                id="omok-online-nickname"
                type="text"
                value={onlineNickname}
                maxLength="12"
                onChange={(event) => setOnlineNickname(event.target.value)}
              />
              {online.errorMessage ? <p className="omok-game__notice is-error" role="alert">{online.errorMessage}</p> : null}
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={saveOnlineNickname} disabled={online.actionStatus === ONLINE_ACTION_STATUS.SAVING_NICKNAME}>
                  {online.actionStatus === ONLINE_ACTION_STATUS.SAVING_NICKNAME ? "저장 중…" : "저장"}
                </Button>
                <Button type="button" variant="secondary" onClick={closeOnlineError} disabled={online.actionStatus === ONLINE_ACTION_STATUS.SAVING_NICKNAME}>취소</Button>
              </div>
            </GameStageModal>
          ) : null}
          {!dialog && online.status === ONLINE_ROOM_LOAD_STATUS.CHECKING_PROFILE ? (
            <GameStageModal role="status" aria-live="polite">
              <p className="omok-game__modal-eyebrow">Online</p>
              <h3>온라인 방을 준비하는 중입니다</h3>
              <p>익명 세션과 닉네임 정보를 확인하고 있어요.</p>
            </GameStageModal>
          ) : null}
          {!dialog && online.status === ONLINE_ROOM_LOAD_STATUS.ERROR && !online.room ? (
            <GameStageModal role="alertdialog" aria-modal="true" aria-labelledby="omok-online-error-title">
              <p className="omok-game__modal-eyebrow">Online</p>
              <h3 id="omok-online-error-title">온라인 방을 열 수 없어요</h3>
              <p>{online.errorMessage}</p>
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={closeOnlineError}>확인</Button>
              </div>
            </GameStageModal>
          ) : null}
          {dialog === DIALOG.SETTINGS ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-settings-title">
              <p className="omok-game__modal-eyebrow">Config</p>
              <h3 id="omok-settings-title">게임 설정</h3>
              <p>대국을 시작할 때 적용할 개인 금수 안내 기본값입니다.</p>
              {settings.gameMode === OMOK_MODE.STANDARD ? (
                <div className="omok-game__settings omok-game__settings--toggles">
                  <OmokSettingToggle checked={settings.showForbiddenPositions} label="내 금수 위치 기본값" onChange={(value) => updateSetting("showForbiddenPositions", value)} />
                  <OmokSettingToggle checked={settings.explainForbiddenReasons} label="내 금수 이유 기본값" onChange={(value) => updateSetting("explainForbiddenReasons", value)} />
                </div>
              ) : null}
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={closeDialog}>확인</Button>
              </div>
            </GameStageModal>
          ) : null}
          {dialog === DIALOG.START || (!dialog && needsOnlineStart) ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-start-title">
              <GameStageDoodle variant="start" />
              <p className="omok-game__modal-eyebrow">Ready</p>
              <h3 id="omok-start-title">대국을 시작합니다</h3>
              <p>{getStoneLabel(activeTurn)}이 먼저 시작합니다.</p>
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={completeStart}>시작</Button>
              </div>
            </GameStageModal>
          ) : null}
          {dialog === DIALOG.RULES ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-rules-title">
              <p className="omok-game__modal-eyebrow">Rules</p>
              <h3 id="omok-rules-title">{OMOK_MODE_LABEL[activeGameMode]}</h3>
              <ul className="omok-game__rule-list">
                {OMOK_RULE_DETAILS[activeGameMode].map((line) => <li key={line}>{line}</li>)}
              </ul>
              {isOnlineContext && online.room ? (
                <dl className="omok-game__rule-info-list">
                  <div><dt>금수 위치 보기</dt><dd>{getAllowedLabel(online.room.allowForbiddenPositions)}</dd></div>
                  <div><dt>금수 이유 설명</dt><dd>{getAllowedLabel(online.room.allowForbiddenReasons)}</dd></div>
                  <div><dt>방장 금수 안내</dt><dd>{hostPlayer ? getPlayerGuideSummaryText(hostPlayer) : "입장 대기 중"}</dd></div>
                  <div><dt>참가자 금수 안내</dt><dd>{guestPlayer ? getPlayerGuideSummaryText(guestPlayer) : "입장 대기 중"}</dd></div>
                  <div>
                    <dt>내 최종 금수 안내</dt>
                    <dd>
                      금수 위치 표시 {getEnabledLabel(online.effectiveShowForbiddenPositions)} · 금수 이유 설명 {getEnabledLabel(online.effectiveExplainForbiddenReasons)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <dl className="omok-game__rule-info-list">
                  <div><dt>금수 위치 표시</dt><dd>{getEnabledLabel(activeMatch.showForbiddenPositions)}</dd></div>
                  <div><dt>금수 이유 설명</dt><dd>{getEnabledLabel(activeMatch.explainForbiddenReasons)}</dd></div>
                </dl>
              )}
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={closeDialog}>확인</Button>
              </div>
            </GameStageModal>
          ) : null}
          {dialog === DIALOG.LEAVE_CONFIRM ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-leave-title">
              <p className="omok-game__modal-eyebrow">Confirm</p>
              <h3 id="omok-leave-title">{isOnlineContext ? "게임 중 방을 나갈까요?" : "게임 중 메뉴로 나갈까요?"}</h3>
              <p>
                {isOnlineContext
                  ? "방을 나가면 현재 대국으로 돌아올 수 없으며 상대에게 퇴장 상태가 표시됩니다."
                  : "메뉴로 나가면 현재 대국은 저장되지 않고 종료됩니다."}
              </p>
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={closeDialog}>계속 두기</Button>
                <Button type="button" variant="secondary" onClick={confirmLeave}>{isOnlineContext ? "방 나가기" : "메뉴로 나가기"}</Button>
              </div>
            </GameStageModal>
          ) : null}
          {resultCopy && !dialog && !needsOnlineStart ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-result-title">
              {shouldCelebrateWinner ? <GameStageDoodle variant="record" /> : null}
              <p className="omok-game__modal-eyebrow">Result</p>
              <h3 id="omok-result-title">{resultCopy.title}</h3>
              <p>{resultCopy.description}</p>
              {isOnlinePlaying ? (
                <>
                  {online.opponentLeft ? <p>상대가 나가서 새 방을 만들어야 합니다.</p> : null}
                  {rematchRequestedByMe ? <p>상대 응답을 기다리는 중입니다.</p> : null}
                  {rematchRequestedByOpponent ? <p>상대가 재대결을 요청했습니다.</p> : null}
                  <div className="game-stage-modal__actions">
                    <Button
                      type="button"
                      onClick={handleOnlineRematchClick}
                      disabled={onlineBusy || online.opponentLeft || rematchRequestedByMe}
                    >
                      한 판 더
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => openDialog(DIALOG.LEAVE_CONFIRM)} disabled={onlineBusy}>방 나가기</Button>
                  </div>
                </>
              ) : (
                <div className="game-stage-modal__actions">
                  <Button type="button" onClick={restartMatch}>한 판 더</Button>
                  <Button type="button" variant="secondary" onClick={() => openDialog(DIALOG.LEAVE_CONFIRM)}>방 나가기</Button>
                </div>
              )}
            </GameStageModal>
          ) : null}
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
