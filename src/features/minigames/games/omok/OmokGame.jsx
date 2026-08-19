import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { useGameBrowserBackGuard } from "../../shared/hooks/useGameBrowserBackGuard.js";
import {
  FORBIDDEN_REASON_LABEL,
  MATCH_TYPE,
  STONE,
} from "./omok.constants.js";
import { useOmokGame } from "./useOmokGame.js";
import { useOmokOnlineRoom } from "./useOmokOnlineRoom.js";
import {
  ONLINE_ACTION_STATUS,
  ONLINE_PLAYER_ROLE,
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
import { createOmokMatchConfig } from "./omok.utils.js";
import { OmokBoard } from "./components/OmokBoard.jsx";
import { OmokDialogs } from "./components/OmokDialogs.jsx";
import { OmokOnlineLobby } from "./components/OmokOnlineLobby.jsx";
import { OmokSidebar } from "./components/OmokSidebar.jsx";
import {
  OmokComputerSetup,
  OmokFriendRoomSetup,
  OmokMenuScreen,
} from "./components/OmokSetupScreens.jsx";
import {
  DEFAULT_OMOK_GAME_META,
  DEFAULT_OMOK_SETTINGS,
  getCompactRuleSummaryText,
  getOnlineResultCopy,
  getResultCopy,
  getStoneLabel,
  OMOK_DIALOG,
  OMOK_SCREEN,
} from "./omok.presentation.js";
import { omokClassName as cx } from "./omokStyles.js";

function getPlayerByRole(room, role) {
  return room?.players?.find((player) => player.role === role) ?? null;
}

export function OmokGame({ game = DEFAULT_OMOK_GAME_META, roomId = null }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const resultSoundRef = useRef(null);
  const committedNicknameRef = useRef(GUEST_FALLBACK_NICKNAME);
  const [screen, setScreen] = useState(OMOK_SCREEN.MENU);
  const [dialog, setDialog] = useState(null);
  const [sharedNickname, setSharedNickname] = useState(GUEST_FALLBACK_NICKNAME);
  const [nicknameSaveError, setNicknameSaveError] = useState(null);
  const [onlineNickname, setOnlineNickname] = useState("");
  const [settings, setSettings] = useState(DEFAULT_OMOK_SETTINGS);
  const [activeMatch, setActiveMatch] = useState(() => createOmokMatchConfig(MATCH_TYPE.COMPUTER, DEFAULT_OMOK_SETTINGS));
  const [matchKey, setMatchKey] = useState(0);
  const [startedOnlineRound, setStartedOnlineRound] = useState(null);
  const navigateFromGame = useGameBrowserBackGuard({
    isExitConfirmationOpen: dialog === OMOK_DIALOG.LEAVE_CONFIRM,
    onNavigate: navigate,
    onRequestExit: requestGameExit,
  });
  const online = useOmokOnlineRoom({
    onNavigateToLobby: () => navigateFromGame("/minigames/omok"),
    onNavigateToRoom: (nextRoomId) => navigateFromGame(`/minigames/omok/room/${encodeURIComponent(nextRoomId)}`),
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
    isActive: screen === OMOK_SCREEN.PLAYING && !online.room,
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
  const isGameScreenVisible = isOnlinePlaying || screen === OMOK_SCREEN.GAME_START || screen === OMOK_SCREEN.PLAYING;
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
  const hasActiveComputerGame = screen === OMOK_SCREEN.PLAYING && !isOnlineContext && activeMoveCount > 0 && !activeWinner && !activeDraw;
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
      if (!cancelled) {
        committedNicknameRef.current = resolved;
        setSharedNickname(resolved);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (online.needsNicknameSetup) {
      setDialog(OMOK_DIALOG.NICKNAME);
      setOnlineNickname(getNicknamePrefillForOnlineSetup());
    } else {
      // A successful save flips needsNicknameSetup false - close the
      // nickname dialog exactly once instead of leaving it open on top of
      // the room flow it just unblocked.
      setDialog((current) => (current === OMOK_DIALOG.NICKNAME ? null : current));
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
    setScreen(OMOK_SCREEN.GAME_START);
    setDialog(OMOK_DIALOG.START);
    setMatchKey((key) => key + 1);
  }

  function createOnlineRoom() {
    setActiveMatch(createOmokMatchConfig(MATCH_TYPE.ONLINE, settings));
    setDialog(null);
    setScreen(OMOK_SCREEN.MENU);
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
    setScreen(OMOK_SCREEN.MENU);
  }

  function restartMatch() {
    setActiveMatch(createOmokMatchConfig(activeMatch.matchType, settings));
    setScreen(OMOK_SCREEN.GAME_START);
    setDialog(OMOK_DIALOG.START);
    setMatchKey((key) => key + 1);
  }

  function completeStart() {
    playSound("countdownFinal");
    if (isOnlineContext) setStartedOnlineRound(online.room?.currentRound ?? null);
    else setScreen(OMOK_SCREEN.PLAYING);
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
      openDialog(OMOK_DIALOG.LEAVE_CONFIRM);
      return;
    }
    online.leaveRoom();
  }

  function requestReturnToMenu() {
    if (hasActiveComputerGame) {
      openDialog(OMOK_DIALOG.LEAVE_CONFIRM);
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

  function saveOnlineNickname() {
    try {
      const normalized = saveLocalSharedNickname(onlineNickname);
      setSharedNickname(normalized);
    } catch {
      // Validation errors surface via online.saveNicknameAndResume's own error state below.
    }

    online.saveNicknameAndResume(onlineNickname);
  }

  async function commitSharedNickname() {
    if (!canEditSidebarNickname) return;

    setNicknameSaveError(null);
    try {
      const savedNickname = await saveSharedNickname(sharedNickname);
      committedNicknameRef.current = savedNickname;
      setSharedNickname(savedNickname);
    } catch (error) {
      setSharedNickname(committedNicknameRef.current);
      setNicknameSaveError(error instanceof Error && error.message
        ? error.message
        : "닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
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

  function handleOnlineRematchClick() {
    if (online.room?.roundRequestedBy && online.room.roundRequestedBy !== online.currentUserId) {
      online.acceptRematch();
      return;
    }
    if (online.room?.roundRequestedBy === online.currentUserId) return;
    online.requestRematch();
  }

  const hostPlayer = getPlayerByRole(online.room, ONLINE_PLAYER_ROLE.HOST);
  const guestPlayer = getPlayerByRole(online.room, ONLINE_PLAYER_ROLE.GUEST);
  const isOnlineHost = online.currentPlayer?.role === ONLINE_PLAYER_ROLE.HOST;
  const canStartOnlineRoom = Boolean(
    isOnlineHost &&
    online.room?.players?.length === 2 &&
    online.room.players.every((player) => player.ready) &&
    !onlineBusy,
  );
  const rematchRequestedByMe = Boolean(online.room?.roundRequestedBy && online.room.roundRequestedBy === online.currentUserId);
  const rematchRequestedByOpponent = Boolean(online.room?.roundRequestedBy && online.room.roundRequestedBy !== online.currentUserId);
  const onlineDeriveWarning = isOnlinePlaying && !onlineGame.valid ? onlineGame.errorMessage : null;
  const showOnlineBlockingOverlay = (
    online.needsNicknameSetup ||
    (online.status === ONLINE_ROOM_LOAD_STATUS.ERROR && !online.room) ||
    online.status === ONLINE_ROOM_LOAD_STATUS.CHECKING_PROFILE
  );
  const canDismissDialog = dialog === OMOK_DIALOG.SETTINGS || dialog === OMOK_DIALOG.RULES;
  const boardInteractionDisabled = dialog === OMOK_DIALOG.START || needsOnlineStart || Boolean(
    isOnlinePlaying
      ? activeWinner || activeDraw || !online.canSubmitMove || online.opponentLeft
      : activeWinner || activeDraw || isComputerThinking,
  );
  const gameStatusMessage = isOnlinePlaying && online.opponentLeft
    ? "상대가 방을 나갔습니다."
    : isOnlinePlaying && online.actionStatus === ONLINE_ACTION_STATUS.SUBMITTING_MOVE
      ? "착수를 동기화하는 중입니다."
      : isComputerThinking
        ? "컴퓨터가 두는 중입니다."
        : getStoneLabel(activeTurn) + " 차례입니다.";
  const players = {
    [STONE.BLACK]: {
      name: getPlayerName(STONE.BLACK),
      status: getPlayerStatus(STONE.BLACK),
    },
    [STONE.WHITE]: {
      name: getPlayerName(STONE.WHITE),
      status: getPlayerStatus(STONE.WHITE),
    },
  };

  function requestGameExit() {
    if (isOnlineContext && online.room) {
      requestLeaveOnlineRoom();
      return;
    }
    if (screen === OMOK_SCREEN.GAME_START || screen === OMOK_SCREEN.PLAYING) {
      requestReturnToMenu();
      return;
    }
    navigateFromGame("/");
  }

  const sidebar = (
    <OmokSidebar
      activeGameMode={activeGameMode}
      activeMatchType={activeMatchType}
      compactRuleSummaryText={compactRuleSummaryText}
      isGameVisible={isGameScreenVisible}
      isOnlineContext={isOnlineContext}
      moveCount={activeMoveCount}
      nickname={sidebarNickname}
      nicknameEditable={canEditSidebarNickname}
      nicknameErrorMessage={canEditSidebarNickname ? nicknameSaveError : null}
      nicknameHelpText={nicknameHelpText}
      onCommitNickname={() => void commitSharedNickname()}
      onNicknameChange={(value) => {
        if (canEditSidebarNickname) {
          setNicknameSaveError(null);
          setSharedNickname(value);
        }
      }}
      onOpenRules={() => openDialog(OMOK_DIALOG.RULES)}
      turn={activeTurn}
    />
  );

  return (
    <GameStage
      actions={(
        <Button type="button" variant="secondary" onClick={requestGameExit}>
          게임 나가기
        </Button>
      )}
      className={cx(`omok-game${isGameScreenVisible ? " is-game-screen" : ""}`)}
      eyebrow={game.eyebrow}
      title={game.title}
      sidebar={sidebar}
      ariaLabel={game.title}
    >
      <div className={cx("omok-game__content")}>
        {online.status === ONLINE_ROOM_LOAD_STATUS.CHECKING_PROFILE ? (
          <div className={cx("omok-game__lobby")} role="status">
            <div className={cx("kicker")}>Online room</div>
            <h3 className={cx("omok-game__section-title")}>온라인 방을 준비하는 중입니다</h3>
            <p className={cx("omok-game__hint")}>익명 세션과 닉네임 정보를 확인하고 있어요.</p>
          </div>
        ) : null}
        {isOnlineWaiting ? (
          <OmokOnlineLobby
            busy={onlineBusy}
            canStart={canStartOnlineRoom}
            copied={online.copied}
            currentPlayer={online.currentPlayer}
            currentUserId={online.currentUserId}
            errorMessage={online.errorMessage}
            guestPlayer={guestPlayer}
            guideSettings={currentGuideSettings}
            hostPlayer={hostPlayer}
            inviteUrl={online.inviteUrl}
            isHost={isOnlineHost}
            onCopyInvite={online.copyInviteUrl}
            onLeave={requestLeaveOnlineRoom}
            onOpenRules={() => openDialog(OMOK_DIALOG.RULES)}
            onSetGuidePreference={updateGuideSetting}
            onSetReady={online.setReady}
            onStart={online.startRoom}
            onUpdateRoomSetting={updateOnlineRoomSetting}
            room={online.room}
            syncWarning={online.syncWarning}
          />
        ) : null}
        {!isOnlineContext && screen === OMOK_SCREEN.MENU ? (
          <OmokMenuScreen
            onlineBusy={onlineBusy}
            onOpenComputerSetup={() => setScreen(OMOK_SCREEN.COMPUTER_SETUP)}
            onOpenFriendRoomSetup={() => setScreen(OMOK_SCREEN.FRIEND_ROOM_CREATE)}
            onOpenSettings={() => openDialog(OMOK_DIALOG.SETTINGS)}
          />
        ) : null}
        {!isOnlineContext && screen === OMOK_SCREEN.FRIEND_ROOM_CREATE ? (
          <OmokFriendRoomSetup
            busy={onlineBusy}
            onBack={() => setScreen(OMOK_SCREEN.MENU)}
            onCreateRoom={createOnlineRoom}
            onUpdateSetting={updateSetting}
            settings={settings}
          />
        ) : null}
        {!isOnlineContext && screen === OMOK_SCREEN.COMPUTER_SETUP ? (
          <OmokComputerSetup
            onBack={() => setScreen(OMOK_SCREEN.MENU)}
            onStart={startComputerMatch}
            onUpdateSetting={updateSetting}
            settings={settings}
          />
        ) : null}
        {isGameScreenVisible ? (
          <OmokBoard
            board={activeBoard}
            draw={activeDraw}
            errorMessage={isOnlinePlaying ? online.errorMessage : null}
            forbiddenMessage={activeForbiddenMessage}
            forbiddenPositionKeys={activeForbiddenPositionKeys}
            interactionDisabled={boardInteractionDisabled}
            lastMove={activeLastMove}
            onMove={handleIntersectionClick}
            players={players}
            rejectedPosition={isOnlinePlaying ? null : forbiddenFeedback?.position ?? null}
            statusMessage={gameStatusMessage}
            syncWarning={online.syncWarning}
            turn={activeTurn}
            winner={activeWinner}
            winningLine={activeWinningLine}
            deriveWarning={onlineDeriveWarning}
          />
        ) : null}
      </div>
      <OmokDialogs
        activeGameMode={activeGameMode}
        activeMatch={activeMatch}
        activeTurn={activeTurn}
        canDismiss={canDismissDialog}
        dialog={dialog}
        effectiveGuideSettings={{
          explainForbiddenReasons: online.effectiveExplainForbiddenReasons,
          showForbiddenPositions: online.effectiveShowForbiddenPositions,
        }}
        guestPlayer={guestPlayer}
        hostPlayer={hostPlayer}
        isOnlineContext={isOnlineContext}
        needsOnlineStart={needsOnlineStart}
        nickname={{
          errorMessage: online.errorMessage,
          isSaving: online.actionStatus === ONLINE_ACTION_STATUS.SAVING_NICKNAME,
          value: onlineNickname,
        }}
        onlineRoomState={{
          errorMessage: online.errorMessage,
          room: online.room,
          status: online.status,
        }}
        onClose={closeDialog}
        onCloseOnlineError={closeOnlineError}
        onCompleteStart={completeStart}
        onConfirmLeave={confirmLeave}
        onNicknameChange={setOnlineNickname}
        onOpenLeaveConfirm={() => openDialog(OMOK_DIALOG.LEAVE_CONFIRM)}
        onRematch={handleOnlineRematchClick}
        onRestart={restartMatch}
        onSaveNickname={saveOnlineNickname}
        onUpdateSetting={updateSetting}
        result={{
          copy: resultCopy,
          isOnlinePlaying,
          onlineBusy,
          opponentLeft: online.opponentLeft,
          rematchRequestedByMe,
          rematchRequestedByOpponent,
          shouldCelebrateWinner,
        }}
        settings={settings}
        showOnlineBlockingOverlay={showOnlineBlockingOverlay}
      />
    </GameStage>
  );
}
