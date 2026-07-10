import { useMemo, useState } from "react";
import { Button } from "../../../../shared/components/Button.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import { createInitialBoard, OMOK_BOARD_SIZE } from "./omok.utils.js";

const DEFAULT_GAME_META = {
  eyebrow: "ONLINE / 1 VS 1",
  title: "오목",
  description: "초대 링크와 랜덤 매칭으로 확장될 1:1 보드 UI입니다.",
};

const VIEW = {
  LOBBY: "lobby",
  GAME: "game",
};

const DIALOG = {
  INVITE: "invite",
  MATCHING: "matching",
  SETTINGS: "settings",
  RESIGN: "resign",
  RESULT_WIN: "result-win",
  RESULT_LOSE: "result-lose",
};

const STAR_POINTS = [
  [3, 3],
  [11, 3],
  [7, 7],
  [3, 11],
  [11, 11],
];

const PREVIEW_STONES = [
  { row: 7, column: 7, color: "black" },
  { row: 8, column: 8, color: "white" },
  { row: 7, column: 8, color: "black" },
  { row: 8, column: 6, color: "white" },
  { row: 7, column: 9, color: "black" },
  { row: 8, column: 7, color: "white" },
  { row: 6, column: 6, color: "black" },
  { row: 7, column: 10, color: "white" },
  { row: 6, column: 7, color: "black", last: true },
];

function pointToPercent(point) {
  return `${6.5 + (point / (OMOK_BOARD_SIZE - 1)) * 87}%`;
}

export function OmokGame({ game = DEFAULT_GAME_META }) {
  const board = useMemo(() => createInitialBoard(), []);
  const [view, setView] = useState(VIEW.LOBBY);
  const [dialog, setDialog] = useState(null);
  const [nickname, setNickname] = useState("guest");

  // Server integration point
  function openDialog(nextDialog) {
    setDialog(nextDialog);
  }

  function closeDialog() {
    setDialog(null);
  }

  function showGame() {
    setDialog(null);
    setView(VIEW.GAME);
  }

  function showLobby() {
    setDialog(null);
    setView(VIEW.LOBBY);
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
        <p className="game-stage__side-note">로그인 연동 후 계정 닉네임과 전적을 이 영역에 연결할 수 있습니다.</p>
      </div>
      <div className="stat-row">
        <div className="stat"><div className="l">Board</div><div className="v">{OMOK_BOARD_SIZE}<small>x{OMOK_BOARD_SIZE}</small></div></div>
        <div className="stat"><div className="l">Mode</div><div className="v"><small>{view === VIEW.GAME ? "Preview" : "Lobby"}</small></div></div>
        <div className="stat"><div className="l">Record</div><div className="v">0<small>W</small></div></div>
        <div className="stat"><div className="l">Rows</div><div className="v">{board.length}</div></div>
      </div>
      {view === VIEW.GAME ? (
        <div className="game-stage__actions">
          <Button type="button" variant="secondary" onClick={() => openDialog(DIALOG.RESIGN)}>기권</Button>
          <Button type="button" variant="secondary" onClick={showLobby}>메뉴</Button>
        </div>
      ) : null}
      <p className="game-stage__side-note">돌 배치와 승패 판정은 추후 오목 규칙 모듈에서 주입할 예정입니다.</p>
    </>
  );

  return (
    <GameStage className="omok-game" eyebrow={game.eyebrow} title={game.title} description={game.description} sidebar={sidebar} fullscreenEnabled ariaLabel={game.title}>
      <div className="omok-game__content">
        {view === VIEW.LOBBY ? (
          <div className="omok-game__lobby" aria-label="오목 메뉴">
            <div>
              <div className="kicker">Game menu</div>
              <h3 className="omok-game__section-title">어떻게 대국할까요?</h3>
            </div>
            <div className="omok-game__menu-grid">
              <button className="omok-game__menu-option" type="button" onClick={() => openDialog(DIALOG.INVITE)}>
                <span className="omok-game__menu-title">방 만들기 <span className="badge coral">Invite</span></span>
                <span className="omok-game__menu-desc">초대 링크를 만들어 아는 사람과 1:1 대국</span>
              </button>
              <button className="omok-game__menu-option" type="button" onClick={() => openDialog(DIALOG.MATCHING)}>
                <span className="omok-game__menu-title">랜덤 매칭 <span className="badge coral">Online</span></span>
                <span className="omok-game__menu-desc">접속 중인 상대와 자동 연결될 영역</span>
              </button>
              <button className="omok-game__menu-option" type="button" onClick={showGame}>
                <span className="omok-game__menu-title">보드 미리보기 <span className="badge">UI</span></span>
                <span className="omok-game__menu-desc">규칙 연동 전 대국 화면만 먼저 확인</span>
              </button>
              <button className="omok-game__menu-option" type="button" onClick={() => openDialog(DIALOG.SETTINGS)}>
                <span className="omok-game__menu-title">게임 설정 <span className="badge">Config</span></span>
                <span className="omok-game__menu-desc">선공, 시간 제한, 금수 규칙 자리</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="omok-game__turns" aria-label="대국자 정보">
              <div className="omok-game__player is-active">
                <span className="omok-game__dot is-black" aria-hidden="true" />
                <div><div className="omok-game__player-name">{nickname || "guest"} (흑)</div><div className="omok-game__player-status">내 차례</div></div>
              </div>
              <span className="omok-game__vs">vs</span>
              <div className="omok-game__player">
                <span className="omok-game__dot is-white" aria-hidden="true" />
                <div><div className="omok-game__player-name">guest_04</div><div className="omok-game__player-status">대기</div></div>
              </div>
            </div>
            <div className="omok-game__board-wrap">
              <div className="omok-game__board" role="img" aria-label={`${OMOK_BOARD_SIZE}x${OMOK_BOARD_SIZE} 오목 보드 UI 미리보기`}>
                <span className="omok-game__grid" aria-hidden="true" />
                {STAR_POINTS.map(([column, row]) => (
                  <span className="omok-game__star" style={{ left: pointToPercent(column), top: pointToPercent(row) }} key={`${column}-${row}`} aria-hidden="true" />
                ))}
                {PREVIEW_STONES.map((stone) => (
                  <span
                    className={`omok-game__stone is-${stone.color}${stone.last ? " is-last" : ""}`}
                    style={{ left: pointToPercent(stone.column), top: pointToPercent(stone.row) }}
                    key={`${stone.color}-${stone.row}-${stone.column}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
            <p className="omok-game__hint">현재 화면은 UI 미리보기입니다. 교차점 클릭, 턴 검증, 승패 판정은 추후 게임 로직에서 처리합니다.</p>
            <div className="game-stage__actions">
              <Button type="button" onClick={() => openDialog(DIALOG.RESULT_WIN)}>승리 모달</Button>
              <Button type="button" variant="secondary" onClick={() => openDialog(DIALOG.RESULT_LOSE)}>패배 모달</Button>
            </div>
          </>
        )}
      </div>
      {dialog ? (
        <GameStageOverlay className="omok-game__overlay-layer" state={dialog}>
          {dialog === DIALOG.INVITE ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-invite-title">
              <p className="game-2048__modal-eyebrow">Invite</p>
              <h3 id="omok-invite-title">초대 링크 생성</h3>
              <p>상대에게 보낼 링크가 이 자리에 표시됩니다.</p>
              <div className="omok-game__dialog-link">momentplay.app/omok/r/K4X2-9QZ</div>
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={showGame}>대국 화면 보기</Button>
                <Button type="button" variant="secondary" onClick={closeDialog}>닫기</Button>
              </div>
            </GameStageModal>
          ) : null}
          {dialog === DIALOG.MATCHING ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-matching-title">
              <p className="game-2048__modal-eyebrow">Matching</p>
              <h3 id="omok-matching-title">상대를 찾는 중</h3>
              <span className="spin" aria-hidden="true" />
              <p>서버 매칭이 연결되면 대국 화면으로 전환됩니다.</p>
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={showGame}>대국 화면 보기</Button>
                <Button type="button" variant="secondary" onClick={closeDialog}>매칭 취소</Button>
              </div>
            </GameStageModal>
          ) : null}
          {dialog === DIALOG.SETTINGS ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-settings-title">
              <p className="game-2048__modal-eyebrow">Config</p>
              <h3 id="omok-settings-title">게임 설정</h3>
              <div className="omok-game__settings">
                <span className="badge coral">흑 선공</span>
                <span className="badge">1분 제한</span>
                <span className="badge coral">금수 사용</span>
              </div>
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={closeDialog}>저장</Button>
                <Button type="button" variant="secondary" onClick={closeDialog}>닫기</Button>
              </div>
            </GameStageModal>
          ) : null}
          {dialog === DIALOG.RESIGN ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-resign-title">
              <p className="game-2048__modal-eyebrow">Confirm</p>
              <h3 id="omok-resign-title">기권할까요?</h3>
              <p>실제 전적 반영은 서버 규칙 연동 후 처리합니다.</p>
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={closeDialog}>계속 두기</Button>
                <Button type="button" variant="secondary" onClick={showLobby}>기권하고 메뉴로</Button>
              </div>
            </GameStageModal>
          ) : null}
          {dialog === DIALOG.RESULT_WIN || dialog === DIALOG.RESULT_LOSE ? (
            <GameStageModal role="dialog" aria-modal="true" aria-labelledby="omok-result-title">
              <p className="game-2048__modal-eyebrow">Result</p>
              <h3 id="omok-result-title">{dialog === DIALOG.RESULT_WIN ? "승리!" : "패배"}</h3>
              <p>{dialog === DIALOG.RESULT_WIN ? "다섯 돌 완성 결과 화면입니다." : "상대가 먼저 다섯 돌을 완성한 결과 화면입니다."}</p>
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={showGame}>다시 보기</Button>
                <Button type="button" variant="secondary" onClick={showLobby}>메뉴로</Button>
              </div>
            </GameStageModal>
          ) : null}
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
