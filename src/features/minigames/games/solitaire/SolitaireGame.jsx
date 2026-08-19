import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { GameRecordCelebration } from "../../shared/components/GameRecordCelebration.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import { PuzzleHintButton, PuzzleHintPanel } from "../../shared/components/PuzzleHintPanel.jsx";
import { getStreakCelebrationCopy, NEXT_ROUND_LABEL, useGameStreak } from "../../shared/gameStreak.js";
import { isNewGameRecord, RECORD_DIRECTION } from "../../shared/gameRecord.js";
import { formatActiveGameTime, useActiveGameTimer } from "../../shared/hooks/useActiveGameTimer.js";
import { useGameBrowserBackGuard } from "../../shared/hooks/useGameBrowserBackGuard.js";
import { usePuzzleHints } from "../../shared/hooks/usePuzzleHints.js";
import {
  dealSolitaire,
  drawSolitaireStock,
  findSolitaireHint,
  getSolitaireRankLabel,
  getSolitaireSelectionCard,
  isSolitaireWon,
  isValidTableauRun,
  moveSolitaireSelection,
  SOLITAIRE_DIFFICULTY,
  SOLITAIRE_DRAW_COUNT,
  SOLITAIRE_SUITS,
} from "./solitaire.logic.js";
import { bindCssModule } from "../../../../shared/styles/bindCssModule.js";
import styles from "./solitaire.module.css";
import { getTableauCardOffset, SolitaireCard } from "./SolitaireCard.jsx";
import { EMPTY_DIFFICULTY_RECORD, readSolitaireRecords, saveSolitaireRecords } from "./solitaireRecords.js";
import { useSolitaireDrag } from "./useSolitaireDrag.js";

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
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const gameStreak = useGameStreak();
  const phaseRef = useRef("idle");
  const nextRoundPendingRef = useRef(false);
  const [phase, setPhase] = useState("idle");
  const [difficulty, setDifficulty] = useState(SOLITAIRE_DIFFICULTY.EASY);
  const [board, setBoard] = useState(() => dealSolitaire());
  const [moves, setMoves] = useState(0);
  const [selection, setSelection] = useState(null);
  const [records, setRecords] = useState(() => readSolitaireRecords());
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const navigateFromGame = useGameBrowserBackGuard({
    isExitConfirmationOpen: isExitOpen,
    onNavigate: navigate,
    onRequestExit: requestExit,
  });
  const [isNewGameOpen, setIsNewGameOpen] = useState(false);
  const { elapsedMs, resetTimer } = useActiveGameTimer(
    phase === "playing" && !isExitOpen && !isNewGameOpen,
  );
  const difficultyRecord = records[difficulty] ?? EMPTY_DIFFICULTY_RECORD;
  const time = formatActiveGameTime(elapsedMs);
  const suggestedMove = findSolitaireHint(board);
  const streakCopy = getStreakCelebrationCopy(gameStreak.completionStreak);
  const suggestedCardLabel = suggestedMove?.card
    ? `${getSolitaireRankLabel(suggestedMove.card.rank)} ${suggestedMove.card.symbol}`
    : null;
  const destinationLabel = suggestedMove?.destination?.type === "foundation"
    ? `${suggestedMove.card.symbol} 완성 칸`
    : suggestedMove?.destination?.type === "tableau"
      ? `${suggestedMove.destination.column + 1}번째 카드 열`
      : null;
  const hint = usePuzzleHints(suggestedMove ? [
    suggestedMove.type === "draw"
      ? { message: "지금 바로 옮길 수 있는 카드가 없어요. 스톡을 살펴보세요.", showStock: true }
      : { message: `${suggestedCardLabel} 카드를 먼저 살펴보세요.`, source: suggestedMove.source },
    suggestedMove.type === "draw"
      ? { message: "스톡을 눌러 새 카드를 공개하면 다음 이동이 생길 수 있어요.", showStock: true }
      : {
        message: suggestedMove.destination.type === "foundation"
          ? "같은 문양은 완성 칸에 A부터 숫자 순서대로 올릴 수 있어요."
          : "카드 열에는 색을 번갈아 한 단계 낮은 숫자를 올릴 수 있어요.",
        destination: suggestedMove.destination,
        source: suggestedMove.source,
      },
    suggestedMove.type === "draw"
      ? { message: "표시된 스톡을 눌러 다음 카드를 공개하세요.", showStock: true }
      : {
        message: `${suggestedCardLabel} 카드를 ${destinationLabel}(으)로 옮겨보세요.`,
        destination: suggestedMove.destination,
        source: suggestedMove.source,
      },
  ] : []);
  const {
    consumeSuppressedClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useSolitaireDrag({
    enabled: phase === "playing",
    onMove: applyMove,
    onSelect: setSelection,
  });

  function startGame(nextDifficulty = difficulty, { preserveStreak = false } = {}) {
    gameStreak.beginRound({ preserveStreak });
    setDifficulty(nextDifficulty);
    setBoard(dealSolitaire());
    setMoves(0);
    setSelection(null);
    setIsNewRecord(false);
    setIsExitOpen(false);
    setIsNewGameOpen(false);
    setPhase("playing");
    phaseRef.current = "playing";
    hint.resetHints();
    resetTimer();
    playSound("countdownFinal");
  }

  function completeGame(finalBoard) {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "completed";
    gameStreak.recordSuccess();
    const finalSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
    const currentRecord = records[difficulty] ?? EMPTY_DIFFICULTY_RECORD;
    const didBreakRecord = isNewGameRecord({
      previous: currentRecord.bestTimeSeconds,
      next: finalSeconds,
      direction: RECORD_DIRECTION.LOWER,
    });
    const nextRecords = {
      ...records,
      [difficulty]: {
        bestTimeSeconds: didBreakRecord ? finalSeconds : currentRecord.bestTimeSeconds,
        completedCount: currentRecord.completedCount + 1,
      },
    };
    setBoard(finalBoard);
    setRecords(nextRecords);
    setIsNewRecord(didBreakRecord);
    setSelection(null);
    setPhase("completed");
    saveSolitaireRecords(nextRecords);
    playSound("clear");
  }

  function chooseDifficulty() {
    gameStreak.disqualifyRound();
    phaseRef.current = "idle";
    setPhase("idle");
  }

  function startNextRound() {
    if (nextRoundPendingRef.current) return;
    nextRoundPendingRef.current = true;
    startGame(difficulty, { preserveStreak: true });
  }

  function applyMove(source, destination) {
    if (phase !== "playing") return false;
    const result = moveSolitaireSelection(board, source, destination);
    if (!result.moved) {
      playSound("wrong");
      return false;
    }
    setMoves((current) => current + 1);
    setSelection(null);
    playSound("move");
    if (isSolitaireWon(result.state)) completeGame(result.state);
    else setBoard(result.state);
    return true;
  }

  function chooseSource(source) {
    if (phase !== "playing") return;
    if (consumeSuppressedClick()) return;
    if (selection) {
      const destination = source.type === "tableau"
        ? { type: "tableau", column: source.column }
        : source.type === "foundation"
          ? { type: "foundation", suit: source.suit }
          : null;
      if (destination && applyMove(selection, destination)) return;
    }

    if (source.type === "tableau" && !isValidTableauRun(board.tableau[source.column], source.index)) {
      setSelection(null);
      return;
    }
    if (!getSolitaireSelectionCard(board, source)) {
      setSelection(null);
      return;
    }
    setSelection((current) => (
      JSON.stringify(current) === JSON.stringify(source) ? null : source
    ));
  }

  function moveToFoundation(source) {
    const card = getSolitaireSelectionCard(board, source);
    if (!card) return;
    applyMove(source, { type: "foundation", suit: card.suit });
  }

  function drawStock() {
    if (phase !== "playing") return;
    const result = drawSolitaireStock(board, SOLITAIRE_DRAW_COUNT[difficulty]);
    if (!result.moved) return;
    setBoard(result.state);
    setMoves((current) => current + 1);
    setSelection(null);
    playSound("move");
  }

  function chooseDestination(destination) {
    if (!selection) return;
    applyMove(selection, destination);
  }

  function requestExit() {
    if (phase === "idle" || phase === "completed") navigateFromGame("/");
    else setIsExitOpen(true);
  }

  phaseRef.current = phase;

  useEffect(() => {
    if (phase === "playing") nextRoundPendingRef.current = false;
  }, [phase]);

  function isHintSource(source) {
    const hintSource = hint.currentStep?.source;
    if (!hintSource || !source || hintSource.type !== source.type) return false;
    if (source.type === "waste") return true;
    if (source.type === "tableau") {
      return hintSource.column === source.column && hintSource.index === source.index;
    }
    return hintSource.suit === source.suit;
  }

  function isHintDestination(destination) {
    const hintDestination = hint.currentStep?.destination;
    if (!hintDestination || !destination || hintDestination.type !== destination.type) return false;
    return destination.type === "tableau"
      ? hintDestination.column === destination.column
      : hintDestination.suit === destination.suit;
  }

  const actions = (
    <div className={cx("game-stage__inline-actions")}>
      {phase === "playing" ? <Button variant="secondary" onClick={() => setIsNewGameOpen(true)}>새 게임</Button> : null}
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
        {SOLITAIRE_DRAW_COUNT[difficulty]}장씩 공개 · 완료 {difficultyRecord.completedCount}회
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
              disabled={phase !== "playing" || (!board.stock.length && !board.waste.length)}
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

      {phase === "playing" ? (
        <div className={cx("solitaire-game__assist")}>
          <PuzzleHintButton hint={hint} />
          <PuzzleHintPanel gameId={game.id} hint={hint} />
        </div>
      ) : null}

      {phase === "idle" ? (
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

      {phase === "completed" ? (
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
            {hint.hasUsedHint ? <p className={cx("puzzle-hint-result-label")}>힌트 사용 · 연습 기록</p> : null}
            <div className={cx("game-stage-modal__actions")}>
              <Button onClick={startNextRound}>{NEXT_ROUND_LABEL}</Button>
              <Button variant="secondary" onClick={chooseDifficulty}>난이도 선택</Button>
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
              <Button onClick={() => setIsNewGameOpen(false)}>계속하기</Button>
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
              <Button onClick={() => setIsExitOpen(false)}>계속하기</Button>
              <Button variant="secondary" onClick={() => {
                gameStreak.disqualifyRound();
                navigateFromGame("/");
              }}>게임 나가기</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
