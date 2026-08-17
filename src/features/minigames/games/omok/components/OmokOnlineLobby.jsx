import { Button } from "../../../../../shared/components/Button.jsx";
import { OMOK_MODE, OMOK_MODE_LABEL } from "../omok.constants.js";
import { ONLINE_PLAYER_ROLE, ONLINE_ROLE_LABEL } from "../online/omokOnline.constants.js";
import { getPlayerGuideSummaryText, getRoomRuleSummaryText } from "../omok.presentation.js";
import { OmokSettingToggle } from "./OmokSettingToggle.jsx";

const GAME_MODE_OPTIONS = Object.values(OMOK_MODE);

export function OmokOnlineLobby({
  busy,
  canStart,
  copied,
  currentPlayer,
  currentUserId,
  errorMessage,
  guestPlayer,
  guideSettings,
  hostPlayer,
  inviteUrl,
  isHost,
  onCopyInvite,
  onLeave,
  onOpenRules,
  onSetGuidePreference,
  onSetReady,
  onStart,
  onUpdateRoomSetting,
  room,
  syncWarning,
}) {
  const playersByRole = [
    [ONLINE_PLAYER_ROLE.HOST, hostPlayer],
    [ONLINE_PLAYER_ROLE.GUEST, guestPlayer],
  ];
  const roomCode = room.id.slice(0, 8).toUpperCase();

  return (
    <div className="omok-game__lobby omok-game__waiting-room" aria-label="오목 온라인 대기실">
      <div>
        <div className="kicker">Online room · {roomCode}</div>
        <h3 className="omok-game__section-title">{room.title}</h3>
        <p className="omok-game__hint">Host는 흑, Guest는 백입니다.</p>
      </div>
      {errorMessage ? <p className="omok-game__notice is-error" role="alert">{errorMessage}</p> : null}
      {syncWarning ? <p className="omok-game__notice" role="status">{syncWarning}</p> : null}
      <div className="omok-game__invite">
        <label className="f-label" htmlFor="omok-invite-url">Invite URL</label>
        <div className="omok-game__invite-row">
          <input className="txt" id="omok-invite-url" type="text" value={inviteUrl} readOnly />
          <Button type="button" variant="secondary" onClick={onCopyInvite} disabled={!inviteUrl}>
            {copied ? "복사됨" : "복사"}
          </Button>
        </div>
        <span className="visually-hidden" role="status">{copied ? "초대 링크가 복사되었습니다." : ""}</span>
      </div>
      <div className="omok-game__room-slots">
        {playersByRole.map(([role, player]) => (
          <div className="omok-game__room-slot" key={role}>
            <span className={`omok-game__dot ${role === ONLINE_PLAYER_ROLE.HOST ? "is-black" : "is-white"}`} aria-hidden="true" />
            <div>
              <div className="omok-game__player-name">
                {player ? `${player.nickname}${player.userId === currentUserId ? " · me" : ""}` : "Waiting"}
              </div>
              <div className="omok-game__player-status">
                {ONLINE_ROLE_LABEL[role]} · {player ? (player.ready ? "Ready" : "Not ready") : "Empty"}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="omok-game__rule-panel" aria-label="공유 방 규칙">
        <div className="omok-game__rule-panel-header">
          <span className="omok-game__player-guide-role">공유 방 규칙</span>
          <button
            type="button"
            className="omok-game__rule-info-button"
            aria-label="규칙 자세히 보기"
            onClick={onOpenRules}
          >
            i
          </button>
        </div>
        <p className="omok-game__hint">{getRoomRuleSummaryText(room)}</p>
        {isHost ? (
          <>
            <div className="omok-game__settings" role="group" aria-label="오목 규칙">
              {GAME_MODE_OPTIONS.map((mode) => (
                <button
                  className={`omok-game__setting-chip${room.gameMode === mode ? " is-selected" : ""}`}
                  type="button"
                  disabled={busy}
                  key={mode}
                  onClick={() => onUpdateRoomSetting("gameMode", mode)}
                >
                  {OMOK_MODE_LABEL[mode]}
                </button>
              ))}
            </div>
            {room.gameMode === OMOK_MODE.STANDARD ? (
              <div className="omok-game__settings omok-game__settings--toggles">
                <OmokSettingToggle checked={room.allowForbiddenPositions} disabled={busy} label="금수 위치 허용" onChange={(value) => onUpdateRoomSetting("allowForbiddenPositions", value)} />
                <OmokSettingToggle checked={room.allowForbiddenReasons} disabled={busy} label="금수 이유 허용" onChange={(value) => onUpdateRoomSetting("allowForbiddenReasons", value)} />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="omok-game__rule-panel" aria-label="플레이어 금수 안내 설정">
        <span className="omok-game__player-guide-role">플레이어 금수 안내</span>
        {playersByRole.map(([role, player]) => {
          const isMe = Boolean(player && player.userId === currentUserId);
          return (
            <div className="omok-game__player-guide-row" key={role}>
              <span className="omok-game__player-guide-role">{ONLINE_ROLE_LABEL[role]}</span>
              {!player ? (
                <p className="omok-game__hint">입장 대기 중</p>
              ) : isMe ? (
                room.gameMode === OMOK_MODE.STANDARD ? (
                  <div className="omok-game__settings omok-game__settings--toggles">
                    <OmokSettingToggle checked={guideSettings.showForbiddenPositions} disabled={busy} label="금수 위치" onChange={(value) => onSetGuidePreference("showForbiddenPositions", value)} />
                    <OmokSettingToggle checked={guideSettings.explainForbiddenReasons} disabled={busy} label="금수 이유" onChange={(value) => onSetGuidePreference("explainForbiddenReasons", value)} />
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
        <Button type="button" onClick={() => onSetReady(!currentPlayer?.ready)} disabled={!currentPlayer || busy}>
          {currentPlayer?.ready ? "준비 취소" : "준비"}
        </Button>
        {isHost ? (
          <Button type="button" variant="secondary" onClick={onStart} disabled={!canStart}>게임 시작</Button>
        ) : (
          <Button type="button" variant="secondary" aria-label="방장이 게임을 시작하기를 기다리는 중" disabled>시작 대기</Button>
        )}
        <Button type="button" variant="secondary" onClick={onLeave} disabled={busy}>나가기</Button>
      </div>
    </div>
  );
}
