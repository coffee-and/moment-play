import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import "./snake-game.css";
import {
  SNAKE_BOARD_SIZE,
  SNAKE_DIRECTION,
  advanceSnake,
  createFood,
  createInitialSnake,
  getSnakeSpeed,
  isOppositeDirection,
  isSamePosition,
} from "./snake.logic.js";

const SNAKE_BEST_KEY = "eunContents.snake.best";
const KEY_DIRECTIONS = {
  ArrowUp: SNAKE_DIRECTION.UP,
  w: SNAKE_DIRECTION.UP,
  W: SNAKE_DIRECTION.UP,
  ArrowRight: SNAKE_DIRECTION.RIGHT,
  d: SNAKE_DIRECTION.RIGHT,
  D: SNAKE_DIRECTION.RIGHT,
  ArrowDown: SNAKE_DIRECTION.DOWN,
  s: SNAKE_DIRECTION.DOWN,
  S: SNAKE_DIRECTION.DOWN,
  ArrowLeft: SNAKE_DIRECTION.LEFT,
  a: SNAKE_DIRECTION.LEFT,
  A: SNAKE_DIRECTION.LEFT,
};

function readBestScore() {
  try {
    const score = Number(window.localStorage.getItem(SNAKE_BEST_KEY));
    return Number.isFinite(score) ? Math.max(0, score) : 0;
  } catch {
    return 0;
  }
}

function writeBestScore(score) {
  try {
    window.localStorage.setItem(SNAKE_BEST_KEY, String(score));
  } catch {
    return;
  }
}

function vibrate(duration = 10) {
  globalThis.navigator?.vibrate?.(duration);
}

export function SnakeGame({ game }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const initialSnake = useMemo(() => createInitialSnake(), []);
  const [snake, setSnake] = useState(initialSnake);
  const [food, setFood] = useState(() => createFood(initialSnake));
  const [phase, setPhase] = useState("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBestScore);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const directionRef = useRef(SNAKE_DIRECTION.RIGHT);
  const queuedDirectionRef = useRef(SNAKE_DIRECTION.RIGHT);
  const pointerStartRef = useRef(null);

  snakeRef.current = snake;
  foodRef.current = food;

  function setDirection(nextDirection) {
    if (phase !== "playing") return;
    if (isOppositeDirection(directionRef.current, nextDirection)) return;
    queuedDirectionRef.current = nextDirection;
    vibrate(6);
  }

  function startGame() {
    playSound("countdownFinal");
    const nextSnake = createInitialSnake();
    directionRef.current = SNAKE_DIRECTION.RIGHT;
    queuedDirectionRef.current = SNAKE_DIRECTION.RIGHT;
    setSnake(nextSnake);
    setFood(createFood(nextSnake));
    setScore(0);
    setIsExitOpen(false);
    setPhase("playing");
  }

  function finishGame() {
    playSound("gameOver");
    setPhase("over");
    vibrate(30);
    setBest((currentBest) => {
      const nextBest = Math.max(currentBest, score);
      if (nextBest !== currentBest) writeBestScore(nextBest);
      return nextBest;
    });
  }

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const timer = window.setInterval(() => {
      const nextDirection = queuedDirectionRef.current;
      directionRef.current = nextDirection;
      const result = advanceSnake(snakeRef.current, nextDirection, foodRef.current);
      if (result.status === "collision") {
        finishGame();
        return;
      }

      setSnake(result.snake);
      if (result.ateFood) {
        playSound("correct");
        const nextScore = score + 1;
        setScore(nextScore);
        setFood(createFood(result.snake));
        vibrate(14);
      }
    }, getSnakeSpeed(score));
    return () => window.clearInterval(timer);
  }, [phase, score]);

  useEffect(() => {
    function handleKeyDown(event) {
      const direction = KEY_DIRECTIONS[event.key];
      if (direction) {
        event.preventDefault();
        setDirection(direction);
        return;
      }
      if (event.key === " " && phase === "playing") {
        event.preventDefault();
        setPhase("paused");
      } else if (event.key === " " && phase === "paused") {
        event.preventDefault();
        setPhase("playing");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function handlePointerDown(event) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event) {
    if (!pointerStartRef.current) return;
    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;
    pointerStartRef.current = null;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setDirection(deltaX > 0 ? SNAKE_DIRECTION.RIGHT : SNAKE_DIRECTION.LEFT);
    } else {
      setDirection(deltaY > 0 ? SNAKE_DIRECTION.DOWN : SNAKE_DIRECTION.UP);
    }
  }

  function requestExit() {
    if (phase === "idle" || phase === "over") {
      navigate("/");
      return;
    }
    setIsExitOpen(true);
  }

  const cells = [];
  for (let y = 0; y < SNAKE_BOARD_SIZE; y += 1) {
    for (let x = 0; x < SNAKE_BOARD_SIZE; x += 1) {
      const segmentIndex = snake.findIndex((segment) => isSamePosition(segment, { x, y }));
      const isFood = food ? isSamePosition(food, { x, y }) : false;
      cells.push(
        <span
          className={[
            "snake-game__cell",
            segmentIndex === 0 ? "is-head" : "",
            segmentIndex > 0 ? "is-body" : "",
            isFood ? "is-food" : "",
          ].filter(Boolean).join(" ")}
          key={`${x}-${y}`}
        />,
      );
    }
  }

  const sidebar = (
    <div className="stat-row">
      <div className="stat"><div className="l">Score</div><div className="v">{score}</div></div>
      <div className="stat"><div className="l">Best</div><div className="v">{best}</div></div>
      <div className="stat"><div className="l">Speed</div><div className="v">{Math.round(1000 / getSnakeSpeed(score))}</div></div>
    </div>
  );

  const actions = (
    <div className="game-stage__inline-actions">
      {phase === "playing" ? <Button variant="secondary" onClick={() => setPhase("paused")}>일시정지</Button> : null}
      {phase === "paused" ? <Button variant="secondary" onClick={() => setPhase("playing")}>계속하기</Button> : null}
      <Button variant="secondary" onClick={requestExit}>게임 나가기</Button>
    </div>
  );

  return (
    <GameStage
      actions={actions}
      ariaLabel="스네이크 게임"
      className="snake-game"
      description={game.description}
      eyebrow="ARCADE / SNAKE"
      fullscreenEnabled
      sidebar={sidebar}
      title={game.title}
    >
      <div className="snake-game__wrap">
        <div
          className="snake-game__board"
          role="application"
          aria-label={`스네이크 보드, 점수 ${score}`}
          onPointerCancel={() => { pointerStartRef.current = null; }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          {cells}
          {phase !== "playing" ? (
            <div className="snake-game__curtain">
              <strong>{phase === "paused" ? "PAUSED" : phase === "over" ? "GAME OVER" : "SNAKE"}</strong>
              <span>{phase === "over" ? `점수 ${score}` : "방향키·스와이프·버튼으로 움직여요."}</span>
              <Button onClick={phase === "paused" ? () => setPhase("playing") : startGame}>
                {phase === "paused" ? "계속하기" : phase === "over" ? "다시 시작" : "게임 시작"}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="snake-game__pad" aria-label="스네이크 방향 조작">
          <button className="snake-game__control is-up" type="button" aria-label="위로 이동" onClick={() => setDirection(SNAKE_DIRECTION.UP)}>↑</button>
          <button className="snake-game__control is-left" type="button" aria-label="왼쪽으로 이동" onClick={() => setDirection(SNAKE_DIRECTION.LEFT)}>←</button>
          <button className="snake-game__control is-down" type="button" aria-label="아래로 이동" onClick={() => setDirection(SNAKE_DIRECTION.DOWN)}>↓</button>
          <button className="snake-game__control is-right" type="button" aria-label="오른쪽으로 이동" onClick={() => setDirection(SNAKE_DIRECTION.RIGHT)}>→</button>
        </div>
      </div>

      {isExitOpen ? (
        <GameStageOverlay state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="snake-exit-title">
            <div className="game-stage-modal__eyebrow">LEAVE GAME</div>
            <h3 id="snake-exit-title">진행 중인 게임을 나갈까요?</h3>
            <p>현재 점수는 저장되지 않아요.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={() => navigate("/")}>나가기</Button>
              <Button variant="secondary" onClick={() => setIsExitOpen(false)}>계속하기</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
