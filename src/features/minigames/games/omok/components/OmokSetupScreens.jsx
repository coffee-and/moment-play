import { Button } from "../../../../../shared/components/Button.jsx";
import { omokClassName as cx } from "../omokStyles.js";
import {
  COMPUTER_DIFFICULTY,
  COMPUTER_DIFFICULTY_LABEL,
  OMOK_MODE,
  OMOK_MODE_LABEL,
  PLAYER_STONE_CHOICE,
  PLAYER_STONE_CHOICE_LABEL,
} from "../omok.constants.js";
import { OmokSettingToggle } from "./OmokSettingToggle.jsx";

const GAME_MODE_OPTIONS = Object.values(OMOK_MODE);
const DIFFICULTY_OPTIONS = Object.values(COMPUTER_DIFFICULTY);
const PLAYER_STONE_OPTIONS = Object.values(PLAYER_STONE_CHOICE);

function SettingChips({ label, onChange, options, selectedValue }) {
  return (
    <div className={cx("omok-game__settings")} role="group" aria-label={label}>
      {options.map(({ label: optionLabel, value }) => (
        <button
          className={cx(`omok-game__setting-chip${selectedValue === value ? " is-selected" : ""}`)}
          type="button"
          key={value}
          onClick={() => onChange(value)}
        >
          {optionLabel}
        </button>
      ))}
    </div>
  );
}

export function OmokMenuScreen({
  onlineBusy,
  onOpenComputerSetup,
  onOpenFriendRoomSetup,
  onOpenSettings,
}) {
  return (
    <div className={cx("omok-game__lobby")} aria-label="오목 메뉴">
      <div>
        <div className={cx("kicker")}>Game menu</div>
        <h3 className={cx("omok-game__section-title")}>어떻게 대국할까요?</h3>
      </div>
      <div className={cx("omok-game__menu-grid")}>
        <button className={cx("omok-game__menu-option")} type="button" disabled>
          <span className={cx("omok-game__menu-title")}>빠른 대전 <span className={cx("badge")}>준비 중</span></span>
          <span className={cx("omok-game__menu-desc")}>온라인 상대를 자동으로 찾아 바로 대국해요.</span>
        </button>
        <button className={cx("omok-game__menu-option")} type="button" onClick={onOpenFriendRoomSetup} disabled={onlineBusy}>
          <span className={cx("omok-game__menu-title")}>친구 초대 <span className={cx("badge coral")}>Invite</span></span>
          <span className={cx("omok-game__menu-desc")}>초대 링크를 보내 친구와 함께 대국해요.</span>
        </button>
        <button className={cx("omok-game__menu-option")} type="button" onClick={onOpenComputerSetup}>
          <span className={cx("omok-game__menu-title")}>컴퓨터 대전 <span className={cx("badge coral")}>AI</span></span>
          <span className={cx("omok-game__menu-desc")}>난이도와 내 돌을 선택해 혼자 대국</span>
        </button>
        <button className={cx("omok-game__menu-option")} type="button" onClick={onOpenSettings}>
          <span className={cx("omok-game__menu-title")}>게임 설정 <span className={cx("badge")}>Config</span></span>
          <span className={cx("omok-game__menu-desc")}>대국 전에 사용할 개인 금수 안내 기본값</span>
        </button>
      </div>
    </div>
  );
}

export function OmokFriendRoomSetup({
  busy,
  onBack,
  onCreateRoom,
  onUpdateSetting,
  settings,
}) {
  return (
    <div className={cx("omok-game__lobby omok-game__setup")} aria-label="친구 초대 방 만들기 설정">
      <div>
        <div className={cx("kicker")}>Friend room</div>
        <h3 className={cx("omok-game__section-title")}>방 만들기 설정</h3>
        <p className={cx("omok-game__hint")}>친구와 함께 사용할 규칙을 정한 뒤 방을 만드세요.</p>
      </div>
      <SettingChips
        label="방 오목 규칙"
        onChange={(value) => onUpdateSetting("gameMode", value)}
        options={GAME_MODE_OPTIONS.map((value) => ({ label: OMOK_MODE_LABEL[value], value }))}
        selectedValue={settings.gameMode}
      />
      {settings.gameMode === OMOK_MODE.STANDARD ? (
        <div className={cx("omok-game__settings omok-game__settings--toggles")}>
          <OmokSettingToggle checked={settings.allowForbiddenPositions} label="금수 위치 허용" onChange={(value) => onUpdateSetting("allowForbiddenPositions", value)} />
          <OmokSettingToggle checked={settings.allowForbiddenReasons} label="금수 이유 허용" onChange={(value) => onUpdateSetting("allowForbiddenReasons", value)} />
        </div>
      ) : null}
      <div className={cx("game-stage__actions omok-game__setup-actions")}>
        <Button type="button" onClick={onCreateRoom} disabled={busy}>방 만들기</Button>
        <Button type="button" variant="secondary" onClick={onBack} disabled={busy}>뒤로</Button>
      </div>
    </div>
  );
}

export function OmokComputerSetup({
  onBack,
  onStart,
  onUpdateSetting,
  settings,
}) {
  return (
    <div className={cx("omok-game__lobby omok-game__setup")} aria-label="컴퓨터 대전 설정">
      <div>
        <div className={cx("kicker")}>Computer match</div>
        <h3 className={cx("omok-game__section-title")}>컴퓨터 대전 설정</h3>
      </div>
      <SettingChips
        label="오목 규칙"
        onChange={(value) => onUpdateSetting("gameMode", value)}
        options={GAME_MODE_OPTIONS.map((value) => ({ label: OMOK_MODE_LABEL[value], value }))}
        selectedValue={settings.gameMode}
      />
      <SettingChips
        label="컴퓨터 난이도"
        onChange={(value) => onUpdateSetting("computerDifficulty", value)}
        options={DIFFICULTY_OPTIONS.map((value) => ({ label: COMPUTER_DIFFICULTY_LABEL[value], value }))}
        selectedValue={settings.computerDifficulty}
      />
      <SettingChips
        label="내 돌 선택"
        onChange={(value) => onUpdateSetting("playerStoneChoice", value)}
        options={PLAYER_STONE_OPTIONS.map((value) => ({ label: PLAYER_STONE_CHOICE_LABEL[value], value }))}
        selectedValue={settings.playerStoneChoice}
      />
      {settings.gameMode === OMOK_MODE.STANDARD ? (
        <div className={cx("omok-game__settings omok-game__settings--toggles")}>
          <OmokSettingToggle checked={settings.showForbiddenPositions} label="금수 위치" onChange={(value) => onUpdateSetting("showForbiddenPositions", value)} />
          <OmokSettingToggle checked={settings.explainForbiddenReasons} label="금수 이유" onChange={(value) => onUpdateSetting("explainForbiddenReasons", value)} />
        </div>
      ) : null}
      <div className={cx("game-stage__actions omok-game__setup-actions")}>
        <Button type="button" onClick={onStart}>게임 시작</Button>
        <Button type="button" variant="secondary" onClick={onBack}>뒤로</Button>
      </div>
    </div>
  );
}
