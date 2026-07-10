import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../../shared/components/Button.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import "./game-2048.css";
import {
  BOARD_SIZE,
  FINAL_TARGET_TILE,
  GAME_2048_BEST_SCORE_KEY,
  GAME_2048_COPY,
  GAME_2048_DIRECTION,
  GAME_2048_PHASE,
  SWIPE_AXIS_DELTA,
  SWIPE_THRESHOLD,
  TARGET_TILES,
} from "./game2048.constants.js";
import {
  addRandomTile,
  createEmptyBoard,
  createInitialBoard,
  getEmptyCellCount,
  getMaxTile,
  hasAvailableMove,
  hasReachedTarget,
  moveBoard,
} from "./game2048.logic.js";

const DEFAULT_GAME_META = {
  eyebrow: "NUMBER / MERGE",
  title: "2048",
  description: "목표 타일을 차례로 완성해 2048에 도전하세요.",
};

const KEY_TO_DIRECTION = {
  ArrowUp: GAME_2048_DIRECTION.UP,
  ArrowRight: GAME_2048_DIRECTION.RIGHT,
  ArrowDown: GAME_2048_DIRECTION.DOWN,
  ArrowLeft: GAME_2048_DIRECTION.LEFT,
  w: GAME_2048_DIRECTION.UP,
  W: GAME_2048_DIRECTION.UP,
  d: GAME_2048_DIRECTION.RIGHT,
  D: GAME_2048_DIRECTION.RIGHT,
  s: GAME_2048_DIRECTION.DOWN,
  S: GAME_2048_DIRECTION.DOWN,
  a: GAME_2048_DIRECTION.LEFT,
  A: GAME_2048_DIRECTION.LEFT,
};

function getBestScore() {
  try {
    const value = Number(window.localStorage.getItem(GAME_2048_BEST_SCORE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    window.localStorage.setItem(GAME_2048_BEST_SCORE_KEY, String(score));
  } catch {
    return;
  }
}

function formatNumber(value) {
  return value.toLocaleString("ko-KR");
}

function getTileSizeClass(value) {
  if (value >= 16384) return "is-tiny";
  if (value >= 1024) return "is-small";
  if (value >= 128) return "is-medium";
  return "";
}

function getPhaseStatus(phase, round, currentTarget) {
  if (phase === GAME_2048_PHASE.IDLE) return "시작 전";
  if (phase === GAME_2048_PHASE.MILESTONE_CLEAR) return `라운드 ${round} 완료`;
  if (phase === GAME_2048_PHASE.COMPLETED) return `${FINAL_TARGET_TILE} 완료`;
  if (phase === GAME_2048_PHASE.ENDLESS) return `${FINAL_TARGET_TILE} 완료, 계속 플레이 중`;
  if (phase === GAME_2048_PHASE.GAME_OVER) return "게임 오버";
  return `라운드 ${round}, 목표 ${currentTarget}`;
}

function getNextTargetLabel(targetIndex) {
  return TARGET_TILES[targetIndex + 1] ?? TARGET_TILES[TARGET_TILES.length - 1];
}

export function Game2048({ game = DEFAULT_GAME_META }) {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => getBestScore());
  const [targetIndex, setTargetIndex] = useState(0);
  const [phase, setPhase] = useState(GAME_2048_PHASE.IDLE);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const boardRef = useRef(board);
  const scoreRef = useRef(score);
  const bestScoreRef = useRef(bestScore);
  const targetIndexRef = useRef(targetIndex);
  const phaseRef = useRef(phase);
  const stageContentRef = useRef(null);
  const boardElementRef = useRef(null);
  const startButtonRef = useRef(null);
  const milestoneButtonRef = useRef(null);
  const completedContinueButtonRef = useRef(null);
  const gameOverButtonRef = useRef(null);
  const resetCancelButtonRef = useRef(null);
  const pointerStartRef = useRef(null);

  const round = targetIndex + 1;
  const currentTarget = TARGET_TILES[targetIndex] ?? TARGET_TILES[TARGET_TILES.length - 1];
  const maxTile = useMemo(() => getMaxTile(board), [board]);
  const emptyCellCount = useMemo(() => getEmptyCellCount(board), [board]);
  const phaseStatus = getPhaseStatus(phase, round, currentTarget);
  const canMoveBoard = (phase === GAME_2048_PHASE.PLAYING || phase === GAME_2048_PHASE.ENDLESS) && !isResetConfirmOpen;
  const hasStarted = phase !== GAME_2048_PHASE.IDLE;
  const isStageCovered = isResetConfirmOpen || phase === GAME_2048_PHASE.MILESTONE_CLEAR || phase === GAME_2048_PHASE.COMPLETED || phase === GAME_2048_PHASE.GAME_OVER;

  boardRef.current = board;
  scoreRef.current = score;
  bestScoreRef.current = bestScore;
  targetIndexRef.current = targetIndex;
  phaseRef.current = phase;

  useEffect(() => {
    if (!stageContentRef.current) return;
    stageContentRef.current.inert = isStageCovered;
  }, [isStageCovered]);

  useEffect(() => {
    if (phase === GAME_2048_PHASE.IDLE) {
      startButtonRef.current?.focus();
    }
    if (phase === GAME_2048_PHASE.MILESTONE_CLEAR && !isResetConfirmOpen) {
      milestoneButtonRef.current?.focus();
    }
    if (phase === GAME_2048_PHASE.COMPLETED && !isResetConfirmOpen) {
      completedContinueButtonRef.current?.focus();
    }
    if (phase === GAME_2048_PHASE.GAME_OVER && !isResetConfirmOpen) {
      gameOverButtonRef.current?.focus();
    }
  }, [isResetConfirmOpen, phase]);

  useEffect(() => {
    if (isResetConfirmOpen) {
      resetCancelButtonRef.current?.focus();
    }
  }, [isResetConfirmOpen]);

  function focusBoard() {
    window.setTimeout(() => boardElementRef.current?.focus(), 0);
  }

  function updateBestScore(nextScore) {
    if (nextScore <= bestScoreRef.current) return;
    bestScoreRef.current = nextScore;
    setBestScore(nextScore);
    saveBestScore(nextScore);
  }

  function startNewGame() {
    const nextBoard = createInitialBoard();
    setBoard(nextBoard);
    setScore(0);
    setTargetIndex(0);
    setIsResetConfirmOpen(false);
    setPhase(GAME_2048_PHASE.PLAYING);
    focusBoard();
  }

  function requestNewGame() {
    if (phaseRef.current === GAME_2048_PHASE.IDLE) {
      startNewGame();
      return;
    }
    if (phaseRef.current === GAME_2048_PHASE.GAME_OVER || phaseRef.current === GAME_2048_PHASE.COMPLETED) {
      startNewGame();
      return;
    }
    setIsResetConfirmOpen(true);
  }

  function closeResetConfirm() {
    setIsResetConfirmOpen(false);
    window.setTimeout(() => {
      if (phaseRef.current === GAME_2048_PHASE.PLAYING || phaseRef.current === GAME_2048_PHASE.ENDLESS) {
        boardElementRef.current?.focus();
        return;
      }
      if (phaseRef.current === GAME_2048_PHASE.MILESTONE_CLEAR) {
        milestoneButtonRef.current?.focus();
      }
    }, 0);
  }

  function finishMove(nextBoard, scoreDelta) {
    const nextScore = scoreRef.current + scoreDelta;
    setBoard(nextBoard);
    setScore(nextScore);
    updateBestScore(nextScore);

    if (phaseRef.current !== GAME_2048_PHASE.ENDLESS && hasReachedTarget(nextBoard, TARGET_TILES[targetIndexRef.current])) {
      if (targetIndexRef.current === TARGET_TILES.length - 1) {
        setPhase(GAME_2048_PHASE.COMPLETED);
        return;
      }
      setPhase(GAME_2048_PHASE.MILESTONE_CLEAR);
      return;
    }

    if (!hasAvailableMove(nextBoard)) {
      setPhase(GAME_2048_PHASE.GAME_OVER);
    }
  }

  function handleMove(direction) {
    if (!canMoveBoard) return;
    const result = moveBoard(boardRef.current, direction);
    if (!result.changed) {
      if (!hasAvailableMove(boardRef.current)) {
        setPhase(GAME_2048_PHASE.GAME_OVER);
      }
      return;
    }
    finishMove(addRandomTile(result.board), result.scoreDelta);
  }

  function handleBoardKeyDown(event) {
    const direction = KEY_TO_DIRECTION[event.key];
    if (!direction || !canMoveBoard) return;
    event.preventDefault();
    handleMove(direction);
  }

  function handlePointerDown(event) {
    if (!canMoveBoard) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event) {
    if (!canMoveBoard || !pointerStartRef.current) return;
    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;
    pointerStartRef.current = null;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const maxDelta = Math.max(absX, absY);
    const axisDelta = Math.abs(absX - absY);
    if (maxDelta < SWIPE_THRESHOLD || axisDelta < SWIPE_AXIS_DELTA) return;
    if (absX > absY) {
      handleMove(deltaX > 0 ? GAME_2048_DIRECTION.RIGHT : GAME_2048_DIRECTION.LEFT);
      return;
    }
    handleMove(deltaY > 0 ? GAME_2048_DIRECTION.DOWN : GAME_2048_DIRECTION.UP);
  }

  function handlePointerCancel() {
    pointerStartRef.current = null;
  }

  function continueToNextTarget() {
    const nextIndex = targetIndexRef.current + 1;
    setTargetIndex(nextIndex);
    if (hasReachedTarget(boardRef.current, TARGET_TILES[nextIndex])) {
      if (nextIndex === TARGET_TILES.length - 1) {
        setPhase(GAME_2048_PHASE.COMPLETED);
        return;
      }
      setPhase(GAME_2048_PHASE.MILESTONE_CLEAR);
      return;
    }
    if (!hasAvailableMove(boardRef.current)) {
      setPhase(GAME_2048_PHASE.GAME_OVER);
      return;
    }
    setPhase(GAME_2048_PHASE.PLAYING);
    focusBoard();
  }

  function continueEndless() {
    if (!hasAvailableMove(boardRef.current)) {
      setPhase(GAME_2048_PHASE.GAME_OVER);
      return;
    }
    setPhase(GAME_2048_PHASE.ENDLESS);
    focusBoard();
  }

  const gameActions = hasStarted ? (
    <Button type="button" variant="secondary" onClick={requestNewGame}>
      {GAME_2048_COPY.reset.newGameButton}
    </Button>
  ) : null;

  const sidebar = (
    <>
      <div className="stat-row">
        <div className="stat"><div className="l">Round</div><div className="v">{phase === GAME_2048_PHASE.ENDLESS ? "∞" : round}</div></div>
        <div className="stat"><div className="l">Target</div><div className="v">{phase === GAME_2048_PHASE.ENDLESS ? "End" : formatNumber(currentTarget)}</div></div>
        <div className="stat"><div className="l">Score</div><div className="v">{formatNumber(score)}</div></div>
        <div className="stat"><div className="l">Best</div><div className="v">{formatNumber(bestScore)}</div></div>
      </div>
      <p className="game-stage__side-note">방향키, 스와이프, 버튼 입력을 모두 같은 이동 처리로 연결합니다.</p>
    </>
  );

  return (
    <GameStage className="game-2048" eyebrow={game.eyebrow} title={game.title} description={game.description} actions={gameActions} sidebar={sidebar} fullscreenEnabled ariaLabel="2048 게임">
      <div ref={stageContentRef} className="game-2048__stage-content" aria-hidden={isStageCovered ? "true" : undefined}>
        {phase === GAME_2048_PHASE.IDLE ? (
          <GameStageModal className="game-2048__modal game-2048__start-modal" role="region" aria-labelledby="game-2048-start-title">
            <p className="game-2048__modal-eyebrow">{GAME_2048_COPY.start.eyebrow}</p>
            <p className="game-2048__target-label">{GAME_2048_COPY.start.targetLabel}</p>
            <strong className="game-2048__target-value">{formatNumber(currentTarget)}</strong>
            <h3 id="game-2048-start-title">{formatNumber(currentTarget)} 타일부터 시작해요.</h3>
            <p>{GAME_2048_COPY.start.description}</p>
            <Button ref={startButtonRef} type="button" onClick={startNewGame}>{GAME_2048_COPY.start.startButton}</Button>
          </GameStageModal>
        ) : (
          <>
            <section className="game-2048__meta" aria-label="2048 게임 정보">
              <div><span>ROUND</span><strong>{phase === GAME_2048_PHASE.ENDLESS ? "COMPLETE" : round}</strong></div>
              <div><span>{phase === GAME_2048_PHASE.ENDLESS ? "MODE" : "TARGET"}</span><strong>{phase === GAME_2048_PHASE.ENDLESS ? "ENDLESS" : formatNumber(currentTarget)}</strong></div>
              <div><span>SCORE</span><strong>{formatNumber(score)}</strong></div>
              <div><span>BEST</span><strong>{formatNumber(bestScore)}</strong></div>
            </section>
            <p className="visually-hidden" aria-live="polite">{phaseStatus}. 현재 점수 {formatNumber(score)}점, 최고 점수 {formatNumber(bestScore)}점, 최대 타일 {formatNumber(maxTile)}.</p>
            <div ref={boardElementRef} className="game-2048__board" role="grid" tabIndex={0} aria-label="2048 게임 보드. 방향키 또는 스와이프로 타일을 이동하세요." aria-rowcount={BOARD_SIZE} aria-colcount={BOARD_SIZE} onKeyDown={handleBoardKeyDown} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel}>
              {board.map((value, index) => {
                const row = Math.floor(index / BOARD_SIZE) + 1;
                const column = (index % BOARD_SIZE) + 1;
                const label = value ? `${row}행 ${column}열, 숫자 ${value}` : `${row}행 ${column}열, 빈칸`;
                return (
                  <div className={`game-2048__cell ${value ? `has-value ${getTileSizeClass(value)}` : "is-empty"}`} data-value={value} role="gridcell" aria-label={label} key={`${row}-${column}`}>
                    {value ? <span>{value}</span> : null}
                  </div>
                );
              })}
            </div>
            <div className="game-2048__dpad" role="group" aria-label="2048 이동 버튼">
              <button className="game-2048__dpad-button is-up" type="button" onClick={() => handleMove(GAME_2048_DIRECTION.UP)} disabled={!canMoveBoard} aria-label="위로 이동">↑</button>
              <button className="game-2048__dpad-button is-left" type="button" onClick={() => handleMove(GAME_2048_DIRECTION.LEFT)} disabled={!canMoveBoard} aria-label="왼쪽으로 이동">←</button>
              <button className="game-2048__dpad-button is-down" type="button" onClick={() => handleMove(GAME_2048_DIRECTION.DOWN)} disabled={!canMoveBoard} aria-label="아래로 이동">↓</button>
              <button className="game-2048__dpad-button is-right" type="button" onClick={() => handleMove(GAME_2048_DIRECTION.RIGHT)} disabled={!canMoveBoard} aria-label="오른쪽으로 이동">→</button>
            </div>
            <p className="game-2048__hint"><span>{GAME_2048_COPY.guidance.gameOverRule}</span><span>{GAME_2048_COPY.guidance.move} 빈칸 {emptyCellCount}칸 · 최대 타일 {formatNumber(maxTile)}</span></p>
          </>
        )}
      </div>
      {isStageCovered ? (
        <GameStageOverlay className="game-2048__overlay-layer" state={isResetConfirmOpen ? "reset-confirm" : phase}>
          {phase === GAME_2048_PHASE.MILESTONE_CLEAR && !isResetConfirmOpen ? (
            <GameStageModal className="game-2048__modal" role="dialog" aria-modal="true" aria-labelledby="game-2048-milestone-title">
              <p className="game-2048__modal-eyebrow">ROUND {round} CLEAR</p>
              <h3 id="game-2048-milestone-title">{formatNumber(currentTarget)} 타일을 완성했어요.</h3>
              <p>{GAME_2048_COPY.milestone.nextTargetLabel}</p>
              <strong>{formatNumber(getNextTargetLabel(targetIndex))}</strong>
              <Button ref={milestoneButtonRef} type="button" onClick={continueToNextTarget}>{GAME_2048_COPY.milestone.nextButtonLabel} {formatNumber(getNextTargetLabel(targetIndex))}</Button>
            </GameStageModal>
          ) : null}
          {phase === GAME_2048_PHASE.COMPLETED && !isResetConfirmOpen ? (
            <GameStageModal className="game-2048__modal game-2048__modal--complete" role="dialog" aria-modal="true" aria-labelledby="game-2048-complete-title">
              <p className="game-2048__modal-eyebrow">{GAME_2048_COPY.completed.eyebrow}</p>
              <h3 id="game-2048-complete-title">{FINAL_TARGET_TILE} {GAME_2048_COPY.completed.title}</h3>
              <p>{GAME_2048_COPY.completed.description}</p>
              <p>{GAME_2048_COPY.completed.detail}</p>
              <div className="game-stage-modal__actions">
                <Button ref={completedContinueButtonRef} type="button" onClick={continueEndless}>{GAME_2048_COPY.completed.continueButton}</Button>
                <Button type="button" variant="secondary" onClick={startNewGame}>{GAME_2048_COPY.completed.newGameButton}</Button>
              </div>
            </GameStageModal>
          ) : null}
          {phase === GAME_2048_PHASE.GAME_OVER && !isResetConfirmOpen ? (
            <GameStageModal className="game-2048__modal" role="dialog" aria-modal="true" aria-labelledby="game-2048-game-over-title">
              <h3 id="game-2048-game-over-title">{GAME_2048_COPY.gameOver.title}</h3>
              <p>{GAME_2048_COPY.gameOver.scoreLabel}</p>
              <strong>{formatNumber(score)}</strong>
              <p>{GAME_2048_COPY.gameOver.maxTileLabel} {formatNumber(maxTile)}</p>
              <Button ref={gameOverButtonRef} type="button" onClick={startNewGame}>{GAME_2048_COPY.gameOver.newGameButton}</Button>
            </GameStageModal>
          ) : null}
          {isResetConfirmOpen ? (
            <GameStageModal className="game-2048__modal" role="dialog" aria-modal="true" aria-labelledby="game-2048-reset-title">
              <h3 id="game-2048-reset-title">{GAME_2048_COPY.reset.title}</h3>
              <p>{GAME_2048_COPY.reset.description}</p>
              <div className="game-stage-modal__actions">
                <Button ref={resetCancelButtonRef} type="button" variant="secondary" onClick={closeResetConfirm}>{GAME_2048_COPY.reset.continueButton}</Button>
                <Button type="button" onClick={startNewGame}>{GAME_2048_COPY.reset.newGameButton}</Button>
              </div>
            </GameStageModal>
          ) : null}
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
