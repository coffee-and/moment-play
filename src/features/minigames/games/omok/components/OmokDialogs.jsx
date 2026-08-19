import { Button } from "../../../../../shared/components/Button.jsx";
import { omokClassName as cx } from "../omokStyles.js";
import { GameStageDoodle } from "../../../shared/components/GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "../../../shared/components/GameStageOverlay.jsx";
import { OMOK_MODE, OMOK_MODE_LABEL, OMOK_RULE_DETAILS } from "../omok.constants.js";
import { ONLINE_ROOM_LOAD_STATUS } from "../online/omokOnline.constants.js";
import {
  getAllowedLabel,
  getEnabledLabel,
  getPlayerGuideSummaryText,
  getStoneLabel,
  OMOK_DIALOG,
} from "../omok.presentation.js";
import { OmokSettingToggle } from "./OmokSettingToggle.jsx";

export function OmokDialogs({
  activeGameMode,
  activeMatch,
  activeTurn,
  canDismiss,
  dialog,
  effectiveGuideSettings,
  guestPlayer,
  hostPlayer,
  isOnlineContext,
  needsOnlineStart,
  nickname,
  onlineRoomState,
  onClose,
  onCloseOnlineError,
  onCompleteStart,
  onConfirmLeave,
  onNicknameChange,
  onOpenLeaveConfirm,
  onRematch,
  onRestart,
  onSaveNickname,
  onUpdateSetting,
  result,
  settings,
  showOnlineBlockingOverlay,
}) {
  const shouldRender = dialog || needsOnlineStart || result.copy || showOnlineBlockingOverlay;
  if (!shouldRender) return null;

  return (
    <GameStageOverlay
      className={cx("omok-game__overlay-layer")}
      state={dialog ?? (needsOnlineStart ? OMOK_DIALOG.START : "result")}
      closeOnBackdrop={canDismiss}
      closeOnEscape={canDismiss}
      onClose={canDismiss ? onClose : undefined}
    >
      {dialog === OMOK_DIALOG.NICKNAME ? (
        <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-online-nickname-title">
          <p className={cx("omok-game__modal-eyebrow")}>Online</p>
          <h3 id="omok-online-nickname-title">온라인 닉네임</h3>
          <p>친구와 함께 볼 이름을 입력해 주세요.</p>
          <label className={cx("f-label")} htmlFor="omok-online-nickname">Nickname</label>
          <input
            className={cx("txt")}
            id="omok-online-nickname"
            type="text"
            value={nickname.value}
            maxLength="12"
            onChange={(event) => onNicknameChange(event.target.value)}
          />
          {nickname.errorMessage ? <p className={cx("omok-game__notice is-error")} role="alert">{nickname.errorMessage}</p> : null}
          <div className={cx("game-stage-modal__actions")}>
            <Button type="button" onClick={onSaveNickname} disabled={nickname.isSaving}>
              {nickname.isSaving ? "저장 중…" : "저장"}
            </Button>
            <Button type="button" variant="secondary" onClick={onCloseOnlineError} disabled={nickname.isSaving}>취소</Button>
          </div>
        </GameStageModal>
      ) : null}
      {!dialog && onlineRoomState.status === ONLINE_ROOM_LOAD_STATUS.CHECKING_PROFILE ? (
        <GameStageModal role="status" aria-live="polite">
          <p className={cx("omok-game__modal-eyebrow")}>Online</p>
          <h3>온라인 방을 준비하는 중입니다</h3>
          <p>익명 세션과 닉네임 정보를 확인하고 있어요.</p>
        </GameStageModal>
      ) : null}
      {!dialog && onlineRoomState.status === ONLINE_ROOM_LOAD_STATUS.ERROR && !onlineRoomState.room ? (
        <GameStageModal role="alertdialog" aria-modal="true" aria-labelledby="omok-online-error-title">
          <p className={cx("omok-game__modal-eyebrow")}>Online</p>
          <h3 id="omok-online-error-title">온라인 방을 열 수 없어요</h3>
          <p>{onlineRoomState.errorMessage}</p>
          <div className={cx("game-stage-modal__actions")}>
            <Button type="button" onClick={onCloseOnlineError}>확인</Button>
          </div>
        </GameStageModal>
      ) : null}
      {dialog === OMOK_DIALOG.SETTINGS ? (
        <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-settings-title">
          <p className={cx("omok-game__modal-eyebrow")}>Config</p>
          <h3 id="omok-settings-title">게임 설정</h3>
          <p>대국을 시작할 때 적용할 개인 금수 안내 기본값입니다.</p>
          {settings.gameMode === OMOK_MODE.STANDARD ? (
            <div className={cx("omok-game__settings omok-game__settings--toggles")}>
              <OmokSettingToggle checked={settings.showForbiddenPositions} label="내 금수 위치 기본값" onChange={(value) => onUpdateSetting("showForbiddenPositions", value)} />
              <OmokSettingToggle checked={settings.explainForbiddenReasons} label="내 금수 이유 기본값" onChange={(value) => onUpdateSetting("explainForbiddenReasons", value)} />
            </div>
          ) : null}
          <div className={cx("game-stage-modal__actions")}>
            <Button type="button" onClick={onClose}>확인</Button>
          </div>
        </GameStageModal>
      ) : null}
      {dialog === OMOK_DIALOG.START || (!dialog && needsOnlineStart) ? (
        <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-start-title">
          <GameStageDoodle variant="start" />
          <p className={cx("omok-game__modal-eyebrow")}>Ready</p>
          <h3 id="omok-start-title">대국을 시작합니다</h3>
          <p>{getStoneLabel(activeTurn)}이 먼저 시작합니다.</p>
          <div className={cx("game-stage-modal__actions")}>
            <Button type="button" onClick={onCompleteStart}>시작</Button>
          </div>
        </GameStageModal>
      ) : null}
      {dialog === OMOK_DIALOG.RULES ? (
        <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-rules-title">
          <p className={cx("omok-game__modal-eyebrow")}>Rules</p>
          <h3 id="omok-rules-title">{OMOK_MODE_LABEL[activeGameMode]}</h3>
          <ul className={cx("omok-game__rule-list")}>
            {OMOK_RULE_DETAILS[activeGameMode].map((line) => <li key={line}>{line}</li>)}
          </ul>
          {isOnlineContext && onlineRoomState.room ? (
            <dl className={cx("omok-game__rule-info-list")}>
              <div><dt>금수 위치 보기</dt><dd>{getAllowedLabel(onlineRoomState.room.allowForbiddenPositions)}</dd></div>
              <div><dt>금수 이유 설명</dt><dd>{getAllowedLabel(onlineRoomState.room.allowForbiddenReasons)}</dd></div>
              <div><dt>방장 금수 안내</dt><dd>{hostPlayer ? getPlayerGuideSummaryText(hostPlayer) : "입장 대기 중"}</dd></div>
              <div><dt>참가자 금수 안내</dt><dd>{guestPlayer ? getPlayerGuideSummaryText(guestPlayer) : "입장 대기 중"}</dd></div>
              <div>
                <dt>내 최종 금수 안내</dt>
                <dd>
                  금수 위치 표시 {getEnabledLabel(effectiveGuideSettings.showForbiddenPositions)} · 금수 이유 설명 {getEnabledLabel(effectiveGuideSettings.explainForbiddenReasons)}
                </dd>
              </div>
            </dl>
          ) : (
            <dl className={cx("omok-game__rule-info-list")}>
              <div><dt>금수 위치 표시</dt><dd>{getEnabledLabel(activeMatch.showForbiddenPositions)}</dd></div>
              <div><dt>금수 이유 설명</dt><dd>{getEnabledLabel(activeMatch.explainForbiddenReasons)}</dd></div>
            </dl>
          )}
          <div className={cx("game-stage-modal__actions")}>
            <Button type="button" onClick={onClose}>확인</Button>
          </div>
        </GameStageModal>
      ) : null}
      {dialog === OMOK_DIALOG.LEAVE_CONFIRM ? (
        <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-leave-title">
          <p className={cx("omok-game__modal-eyebrow")}>Confirm</p>
          <h3 id="omok-leave-title">{isOnlineContext ? "게임 중 방을 나갈까요?" : "게임 중 메뉴로 나갈까요?"}</h3>
          <p>
            {isOnlineContext
              ? "방을 나가면 현재 대국으로 돌아올 수 없으며 상대에게 퇴장 상태가 표시됩니다."
              : "메뉴로 나가면 현재 대국은 저장되지 않고 종료됩니다."}
          </p>
          <div className={cx("game-stage-modal__actions")}>
            <Button type="button" onClick={onClose}>계속 두기</Button>
            <Button type="button" variant="secondary" onClick={onConfirmLeave}>{isOnlineContext ? "방 나가기" : "메뉴로 나가기"}</Button>
          </div>
        </GameStageModal>
      ) : null}
      {result.copy && !dialog && !needsOnlineStart ? (
        <GameStageModal
          celebrationStreak={1}
          showCompletionStars={result.shouldCelebrateWinner}
          role="dialog"
          aria-modal="true"
          aria-labelledby="omok-result-title"
        >
          {result.shouldCelebrateWinner ? <GameStageDoodle variant="record" /> : null}
          <p className={cx("omok-game__modal-eyebrow")}>Result</p>
          <h3 id="omok-result-title">{result.copy.title}</h3>
          <p>{result.copy.description}</p>
          {result.isOnlinePlaying ? (
            <>
              {result.opponentLeft ? <p>상대가 나가서 새 방을 만들어야 합니다.</p> : null}
              {result.rematchRequestedByMe ? <p>상대 응답을 기다리는 중입니다.</p> : null}
              {result.rematchRequestedByOpponent ? <p>상대가 재대결을 요청했습니다.</p> : null}
              <div className={cx("game-stage-modal__actions")}>
                <Button
                  type="button"
                  onClick={onRematch}
                  disabled={result.onlineBusy || result.opponentLeft || result.rematchRequestedByMe}
                >
                  한 판 더
                </Button>
                <Button type="button" variant="secondary" onClick={onOpenLeaveConfirm} disabled={result.onlineBusy}>방 나가기</Button>
              </div>
            </>
          ) : (
            <div className={cx("game-stage-modal__actions")}>
              <Button type="button" onClick={onRestart}>한 판 더</Button>
              <Button type="button" variant="secondary" onClick={onOpenLeaveConfirm}>방 나가기</Button>
            </div>
          )}
        </GameStageModal>
      ) : null}
    </GameStageOverlay>
  );
}
