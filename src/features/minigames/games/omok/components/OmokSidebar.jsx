import {
  MATCH_TYPE_COMPACT_LABEL,
  MATCH_TYPE_LABEL,
  OMOK_BOARD_SIZE,
  OMOK_MODE_COMPACT_LABEL,
  OMOK_MODE_LABEL,
} from "../omok.constants.js";
import { getStoneLabel } from "../omok.presentation.js";

export function OmokSidebar({
  activeGameMode,
  activeMatchType,
  compactRuleSummaryText,
  isGameVisible,
  isOnlineContext,
  moveCount,
  nickname,
  nicknameEditable,
  nicknameHelpText,
  onCommitNickname,
  onNicknameChange,
  onOpenRules,
  turn,
}) {
  const guideEnabled = compactRuleSummaryText.includes("사용 중");
  const matchLabel = isGameVisible
    ? MATCH_TYPE_LABEL[activeMatchType]
    : isOnlineContext
      ? "Friend room"
      : "선택 전";
  const compactMatchLabel = isGameVisible
    ? MATCH_TYPE_COMPACT_LABEL[activeMatchType]
    : isOnlineContext
      ? "FRIEND"
      : "—";

  return (
    <>
      <div>
        <label className="f-label" htmlFor="omok-nickname">Nickname</label>
        <input
          className="txt"
          id="omok-nickname"
          type="text"
          value={nickname}
          maxLength="12"
          readOnly={!nicknameEditable}
          aria-readonly={!nicknameEditable}
          onChange={(event) => onNicknameChange(event.target.value)}
          onBlur={onCommitNickname}
        />
        <p className="game-stage__side-note">{nicknameHelpText}</p>
      </div>
      <div className="stat-row">
        <div className="stat"><div className="l">Board</div><div className="v">{OMOK_BOARD_SIZE}<small>x{OMOK_BOARD_SIZE}</small></div></div>
        <div className="stat"><div className="l">Match</div><div className="v"><small aria-label={matchLabel}>{compactMatchLabel}</small></div></div>
        {isGameVisible ? (
          <>
            <div className="stat"><div className="l">Turn</div><div className="v"><small>{getStoneLabel(turn)}</small></div></div>
            <div className="stat"><div className="l">Moves</div><div className="v">{moveCount}</div></div>
          </>
        ) : (
          <>
            <div className="stat"><div className="l">Rule</div><div className="v"><small aria-label={OMOK_MODE_LABEL[activeGameMode]}>{OMOK_MODE_COMPACT_LABEL[activeGameMode]}</small></div></div>
            <div className="stat"><div className="l">Guide</div><div className="v"><small>{guideEnabled ? "사용 중" : "사용 안 함"}</small></div></div>
          </>
        )}
      </div>
      <p className="game-stage__side-note omok-game__rule-summary">
        <span className="omok-game__rule-summary-text">
          <span>{OMOK_MODE_LABEL[activeGameMode]}</span>
          <span>{guideEnabled ? "금수 도움 사용 중" : "금수 도움 사용 안 함"}</span>
        </span>
        <button
          type="button"
          className="omok-game__rule-info-button"
          aria-label="규칙 자세히 보기"
          onClick={onOpenRules}
        >
          i
        </button>
      </p>
    </>
  );
}
