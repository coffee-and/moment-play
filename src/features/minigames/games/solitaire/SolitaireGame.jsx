import { Button } from "../../../../shared/components/Button.jsx";
import { bindCssModule } from "../../../../shared/styles/bindCssModule.js";
import { GameRecordCelebration } from "../../shared/components/GameRecordCelebration.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import { PuzzleHintButton, PuzzleHintPanel } from "../../shared/components/PuzzleHintPanel.jsx";
import { NEXT_ROUND_LABEL } from "../../shared/gameStreak.js";
import { formatActiveGameTime } from "../../shared/hooks/useActiveGameTimer.js";
import {
  getSolitaireRankLabel,
  SOLITAIRE_DIFFICULTY,
  SOLITAIRE_SUITS,
} from "./solitaire.logic.js";
import styles from "./solitaire.module.css";
import { getTableauCardOffset, SolitaireCard } from "./SolitaireCard.jsx";
import { SOLITAIRE_PHASE } from "./solitaireReducer.js";
import { useSolitaireGame } from "./useSolitaireGame.js";

const cx = bindCssModule(styles);

const DIFFICULTY_COPY = {
  [SOLITAIRE_DIFFICULTY.EASY]: {
    label: "쉬움",
    eyebrow: "DRAW 1",
    description: "스톡에서 한 장씩 공개해 선택 폭이 넓어요.",
  },
  [SOLITAIRE_DIFFICULTY.HARD]: {
    label: "어려움",
    eyebrow: "DRAW 3",
    description: "세 장씩 공개하고 맨 위 카드만 사용할 수 있어요.",
  },
};

export { readSolitaireRecords } from "./solitaireRecords.js";

function formatRecordTime(seconds) {
  return seconds == null ? "--:--" : formatActiveGameTime(seconds * 1000);
}


export function SolitaireGame({ game }) {
  const {
    assisted,
    board,
    chooseDestination,
    chooseDifficulty,
    chooseSource,
    closeDialog,
    confirmExit,
    difficulty,
    difficultyRecord,
    drag,
    drawCount,
    drawStock,
    gameStreak,
    hint,
    history,
    isExitOpen,
    isHintDestination,
    isHintSource,
    isNewGameOpen,
    isNewRecord,
    moves,
    moveToFoundation,
    openNewGame,
    phase,
    records,
    requestExit,
    selection,
    startGame,
    startNextRound,
    streakCopy,
    time,
    undo,
  } = useSolitaireGame();
  const { handlePointerDown, handlePointerMove, handlePointerUp } = drag;

  const actions = (
    <div className={cx("game-stage__inline-actions")}>
      {phase === SOLITAIRE_PHASE.PLAYING ? <Button variant="secondary" onClick={openNewGame}>새 게임</Button> : null}
      <Button variant="secondary" onClick={requestExit}>게임 나가기</Button>
    </div>
  );
  const sidebar = (
    <>
      <div className={cx("stat-row")}>
        <div className={cx("stat")}><div className={cx("l")}>Mode</div><div className={cx("v")}><small>{DIFFICULTY_COPY[difficulty].label}</small></div></div>
        <div className={cx("stat")}><div className={cx("l")}>Time</div><div className={cx("v")}>{time}</div></div>
        <div className={cx("stat")}><div className={cx("l")}>Moves</div><div className={cx("v")}>{moves}</div></div>
        <div className={cx("stat")}><div className={cx("l")}>Best</div><div className={cx("v")}>{formatRecordTime(difficultyRecord.bestTimeSeconds)}</div></div>
      </div>
      <p className={cx("game-stage__side-note")}>
        {drawCount}장씩 공개 · 완료 {difficultyRecord.completedCount}회
      </p>
    </>
  );

  return (
    <GameStage
      actions={actions}
      ariaLabel="솔리테어 게임"
      className={cx("solitaire-game")}
      eyebrow="CARD / KLONDIKE"
      sidebar={sidebar}
      title={game.title}
    >
      <div
        className={cx(`solitaire-game__board${selection ? " has-selection" : ""}`)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="application"
        aria-label="클론다이크 솔리테어 카드판"
      >
        <div className={cx("solitaire-game__top")}>
          <div className={cx("solitaire-game__draw-piles")}>
            <button
              aria-label={board.stock.length ? `스톡 ${board.stock.length}장, 카드 공개` : "버린 카드 다시 섞기"}
              className={cx(`solitaire-pile solitaire-stock${board.stock.length ? " has-cards" : ""}${hint.currentStep?.showStock ? " is-hint-target" : ""}`)}
              disabled={phase !== SOLITAIRE_PHASE.PLAYING || (!board.stock.length && !board.waste.length)}
              onClick={drawStock}
              type="button"
            >
              {board.stock.length ? <span className={cx("solitaire-card is-back")}><span /></span> : <span className={cx("solitaire-stock__reset")}>↻</span>}
            </button>
            <div className={cx("solitaire-pile solitaire-waste")} aria-label="버린 카드">
              {board.waste.slice(-3).map((card, index, shownCards) => {
                const isTop = index === shownCards.length - 1;
                return isTop ? (
                  <SolitaireCard
                    card={card}
                    className={cx(`is-waste is-offset-${index}${isHintSource({ type: "waste" }) ? " is-hint-target" : ""}`)}
                    key={card.id}
                    onClick={() => chooseSource({ type: "waste" })}
                    onDoubleClick={() => moveToFoundation({ type: "waste" })}
                    source={{ type: "waste" }}
                  />
                ) : (
                  <span className={cx(`solitaire-card is-front is-${card.color} is-waste is-offset-${index}`)} key={card.id}>
                    <span className={cx("solitaire-card__corner")}><strong>{getSolitaireRankLabel(card.rank)}</strong><span>{card.symbol}</span></span>
                  </span>
                );
              })}
            </div>
          </div>

          <div className={cx("solitaire-game__foundations")} aria-label="완성 카드 칸">
            {SOLITAIRE_SUITS.map((suit) => {
              const foundation = board.foundations[suit.id];
              const topCard = foundation.at(-1);
              const source = { type: "foundation", suit: suit.id };
              return (
                <div
                  className={cx(`solitaire-pile solitaire-foundation${isHintDestination({ type: "foundation", suit: suit.id }) ? " is-hint-target" : ""}`)}
                  data-drop-type="foundation"
                  data-drop-suit={suit.id}
                  key={suit.id}
                >
                  {topCard ? (
                    <SolitaireCard
                      card={topCard}
                      className={cx(selection?.type === "foundation" && selection.suit === suit.id ? "is-selected" : "")}
                      onClick={() => chooseSource(source)}
                      source={source}
                    />
                  ) : (
                    <button
                      aria-label={`${suit.label} 완성 카드 칸`}
                      className={cx(`solitaire-foundation__empty is-${suit.color}`)}
                      onClick={() => chooseDestination({ type: "foundation", suit: suit.id })}
                      type="button"
                    >
                      {suit.symbol}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className={cx("solitaire-game__tableau")} aria-label="카드 열">
          {board.tableau.map((column, columnIndex) => (
            <div
              className={cx(`solitaire-tableau-column${isHintDestination({ type: "tableau", column: columnIndex }) ? " is-hint-target" : ""}`)}
              data-drop-type="tableau"
              data-drop-column={columnIndex}
              key={columnIndex}
            >
              {column.length === 0 ? (
                <button
                  aria-label={`${columnIndex + 1}번째 빈 카드 열`}
                  className={cx("solitaire-tableau-empty")}
                  onClick={() => chooseDestination({ type: "tableau", column: columnIndex })}
                  type="button"
                >
                  K
                </button>
              ) : null}
              {column.map((card, cardIndex) => {
                const source = { type: "tableau", column: columnIndex, index: cardIndex };
                const selected = selection?.type === "tableau"
                  && selection.column === columnIndex
                  && cardIndex >= selection.index;
                return (
                  <SolitaireCard
                    card={card}
                    className={cx(`is-tableau${selected ? " is-selected" : ""}${isHintSource(source) ? " is-hint-target" : ""}`)}
                    key={card.id}
                    onClick={card.faceUp ? () => chooseSource(source) : undefined}
                    onDoubleClick={card.faceUp && cardIndex === column.length - 1 ? () => moveToFoundation(source) : undefined}
                    source={card.faceUp ? source : null}
                    style={getTableauCardOffset(column, cardIndex)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <p className={cx("solitaire-game__hint")}>
          카드를 탭하거나 끌어서 옮기세요. 완성 칸으로 보낼 카드는 두 번 탭할 수 있어요.
        </p>
      </div>

      {phase === SOLITAIRE_PHASE.PLAYING ? (
        <div className={cx("solitaire-game__assist")}>
          <Button disabled={history.length === 0} size="small" variant="secondary" onClick={undo}>
            되돌리기
          </Button>
          <PuzzleHintButton hint={hint} />
          <PuzzleHintPanel gameId={game.id} hint={hint} />
        </div>
      ) : null}

      {phase === SOLITAIRE_PHASE.IDLE ? (
        <GameStageOverlay state="start">
          <GameStageModal className={cx("solitaire-game__modal")} role="dialog" aria-modal="true" aria-labelledby="solitaire-start-title">
            <GameStageDoodle variant="start" />
            <div className={cx("game-stage-modal__eyebrow")}>CARD / KLONDIKE</div>
            <h3 id="solitaire-start-title">오늘의 카드를 정리해볼까요?</h3>
            <p>색을 번갈아 내림차순으로 쌓고, 네 문양을 A부터 K까지 완성하세요.</p>
            <div className={cx("solitaire-game__difficulty-list")} role="group" aria-label="솔리테어 난이도 선택">
              {Object.entries(DIFFICULTY_COPY).map(([id, copy]) => (
                <button className={cx("solitaire-game__difficulty")} key={id} onClick={() => startGame(id)} type="button">
                  <span>{copy.eyebrow}</span>
                  <strong>{copy.label}</strong>
                  <small>{copy.description}</small>
                  <b>BEST {formatRecordTime(records[id].bestTimeSeconds)}</b>
                </button>
              ))}
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === SOLITAIRE_PHASE.COMPLETED ? (
        <GameStageOverlay state="completed">
          <GameStageModal
            celebrationStreak={gameStreak.completionStreak}
            className={cx("solitaire-game__modal")}
            showCompletionStars
            role="dialog"
            aria-modal="true"
            aria-labelledby="solitaire-complete-title"
          >
            <GameRecordCelebration isNewRecord={isNewRecord} />
            <div className={cx("game-stage-modal__eyebrow")}>{isNewRecord ? "NEW RECORD" : "SOLITAIRE CLEAR"}</div>
            <h3 id="solitaire-complete-title">{streakCopy.title}</h3>
            <p>{streakCopy.subtitle}</p>
            <p>{DIFFICULTY_COPY[difficulty].label} 모드 · {time} · {moves}번 이동</p>
            {assisted ? <p className={cx("puzzle-hint-result-label")}>도움 기능 사용 · 연습 기록</p> : null}
            <div className={cx("game-stage-modal__actions")}>
              <Button onClick={startNextRound}>{NEXT_ROUND_LABEL}</Button>
              <Button variant="secondary" onClick={chooseDifficulty}>난이도 선택</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === SOLITAIRE_PHASE.STALLED && !isExitOpen ? (
        <GameStageOverlay state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="solitaire-stalled-title">
            <div className={cx("game-stage-modal__eyebrow")}>NO MORE MOVES</div>
            <h3 id="solitaire-stalled-title">더 진행할 수 있는 수가 없어요.</h3>
            <p>현재 패는 처음에 완주 가능했지만, 선택한 이동으로 길이 막혔어요.</p>
            <div className={cx("game-stage-modal__actions")}>
              {history.length > 0 ? <Button onClick={undo}>이전 수로 돌아가기</Button> : null}
              <Button variant="secondary" onClick={() => startGame(difficulty)}>검증된 새 패 받기</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {isNewGameOpen ? (
        <GameStageOverlay state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="solitaire-new-title">
            <div className={cx("game-stage-modal__eyebrow")}>NEW GAME</div>
            <h3 id="solitaire-new-title">새 카드를 받을까요?</h3>
            <p>현재 진행은 저장되지 않고 새 게임이 시작돼요.</p>
            <div className={cx("game-stage-modal__actions")}>
              <Button onClick={closeDialog}>계속하기</Button>
              <Button variant="secondary" onClick={() => startGame(difficulty)}>새 게임</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {isExitOpen ? (
        <GameStageOverlay state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="solitaire-exit-title">
            <div className={cx("game-stage-modal__eyebrow")}>LEAVE GAME</div>
            <h3 id="solitaire-exit-title">게임을 나갈까요?</h3>
            <p>현재 카드 진행은 저장되지 않아요.</p>
            <div className={cx("game-stage-modal__actions")}>
              <Button onClick={closeDialog}>계속하기</Button>
              <Button variant="secondary" onClick={confirmExit}>게임 나가기</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
