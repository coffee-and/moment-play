import { useState } from "react";
import { Button } from "../../shared/components/Button.jsx";
import { GameStageModal, GameStageOverlay } from "../minigames/shared/components/GameStageOverlay.jsx";
import { OMOK_MODE, OMOK_MODE_LABEL } from "../minigames/games/omok/omok.constants.js";

const DEFAULT_INVITE_SETTINGS = Object.freeze({
  allowForbiddenPositions: true,
  allowForbiddenReasons: true,
  explainForbiddenReasons: true,
  gameMode: OMOK_MODE.STANDARD,
  showForbiddenPositions: true,
});

const GAME_MODE_OPTIONS = Object.values(OMOK_MODE);

export function FriendOmokInviteDialog({ friend, isSubmitting, errorMessage, onClose, onSubmit }) {
  const [settings, setSettings] = useState(DEFAULT_INVITE_SETTINGS);
  const isFreeMode = settings.gameMode === OMOK_MODE.FREE;

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
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

  return (
    <GameStageOverlay
      className="friend-invite-overlay"
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
      onClose={onClose}
      aria-label="친구 오목 초대 설정"
    >
      <GameStageModal className="friend-invite-modal" role="dialog" aria-modal="true" aria-labelledby="friend-invite-title">
        <form className="friend-invite-form" onSubmit={handleSubmit}>
          <header className="friend-invite-form__header">
            <p className="eyebrow">Omok Invite</p>
            <h2 id="friend-invite-title">{friend.nickname}님에게 오목 초대</h2>
            <p>초대를 보내면 온라인 대기실이 만들어지고 15분 동안 유지됩니다.</p>
          </header>

          <fieldset className="friend-invite-form__group">
            <legend>오목 규칙</legend>
            <div className="friend-invite-form__chips">
              {GAME_MODE_OPTIONS.map((mode) => (
                <button
                  className={`friend-invite-form__chip${settings.gameMode === mode ? " is-selected" : ""}`}
                  type="button"
                  key={mode}
                  aria-pressed={settings.gameMode === mode}
                  onClick={() => updateSetting("gameMode", mode)}
                  disabled={isSubmitting}
                >
                  {OMOK_MODE_LABEL[mode]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="friend-invite-form__settings-grid">
            <fieldset className="friend-invite-form__group">
              <legend>방 안내 허용</legend>
              <label className="friend-invite-form__toggle">
                <span>금수 위치 보기 허용</span>
                <input
                  type="checkbox"
                  checked={settings.allowForbiddenPositions}
                  disabled={isSubmitting || isFreeMode}
                  onChange={(event) => updateSetting("allowForbiddenPositions", event.target.checked)}
                />
              </label>
              <label className="friend-invite-form__toggle">
                <span>금수 이유 설명 허용</span>
                <input
                  type="checkbox"
                  checked={settings.allowForbiddenReasons}
                  disabled={isSubmitting || isFreeMode}
                  onChange={(event) => updateSetting("allowForbiddenReasons", event.target.checked)}
                />
              </label>
            </fieldset>

            <fieldset className="friend-invite-form__group">
              <legend>내 금수 안내</legend>
              <label className="friend-invite-form__toggle">
                <span>금수 위치 표시</span>
                <input
                  type="checkbox"
                  checked={settings.showForbiddenPositions}
                  disabled={isSubmitting || isFreeMode}
                  onChange={(event) => updateSetting("showForbiddenPositions", event.target.checked)}
                />
              </label>
              <label className="friend-invite-form__toggle">
                <span>금수 이유 설명</span>
                <input
                  type="checkbox"
                  checked={settings.explainForbiddenReasons}
                  disabled={isSubmitting || isFreeMode}
                  onChange={(event) => updateSetting("explainForbiddenReasons", event.target.checked)}
                />
              </label>
            </fieldset>
          </div>

          {isFreeMode ? <p className="friend-invite-form__note">Free Omok에서는 금수 규칙이 적용되지 않습니다.</p> : null}
          {errorMessage ? <p className="friends-page__notice is-error" role="alert">{errorMessage}</p> : null}

          <div className="game-stage-modal__actions friend-invite-form__actions">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "초대 보내는 중…" : "초대 보내고 대기실 입장"}</Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>취소</Button>
          </div>
        </form>
      </GameStageModal>
    </GameStageOverlay>
  );
}
