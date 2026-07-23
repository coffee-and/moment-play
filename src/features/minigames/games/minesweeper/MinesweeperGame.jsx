import { useRef, useState } from "react";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { FlagIcon } from "../../../../shared/components/icons/PhosphorIcons.jsx";
import { BoardViewport } from "../../shared/components/BoardViewport.jsx";
import { LogicPuzzleStage } from "../../shared/components/LogicPuzzleStage.jsx";
import { usePuzzleSession } from "../../shared/hooks/usePuzzleSession.js";
import {
  createHiddenBoard,
  isMinesweeperWon,
  MINE_CELL_STATE,
  plantMines,
  revealMineCell,
  toggleMineFlag,
} from "./minesweeper.logic.js";
import "./minesweeper.css";

const SIZE = 9;
const MINE_COUNT = 10;
const MINESWEEPER_BEST_KEY = "eunContents.minesweeper.bestTime";

export function MinesweeperGame({ game }) {
  const { playSound } = useGameAudio();
  const session = usePuzzleSession(MINESWEEPER_BEST_KEY);
  const [board, setBoard] = useState(() => createHiddenBoard(SIZE));
  const [hasPlantedMines, setHasPlantedMines] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [status, setStatus] = useState("첫 칸은 항상 안전해요.");
  const boardRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const suppressClickRef = useRef(false);

  function startGame() {
    setBoard(createHiddenBoard(SIZE));
    setHasPlantedMines(false);
    setFlagMode(false);
    setStatus("첫 칸은 항상 안전해요.");
    session.start();
  }

  function flagCell(index) {
    setBoard((current) => toggleMineFlag(current, index));
    setStatus("깃발을 표시했어요.");
    playSound("correct", { feedback: false });
  }

  function revealCell(index) {
    if (session.phase !== "playing") return;
    if (flagMode) {
      flagCell(index);
      return;
    }
    let activeBoard = board;
    if (!hasPlantedMines) {
      activeBoard = plantMines(SIZE, MINE_COUNT, index, Math.random, board);
      setHasPlantedMines(true);
    }
    const result = revealMineCell(activeBoard, index, SIZE);
    if (!result.changed) return;
    setBoard(result.board);
    if (result.hitMine) {
      setStatus("지뢰를 밟았어요.");
      playSound("wrong");
      session.fail();
      return;
    }
    if (isMinesweeperWon(result.board)) {
      setStatus("모든 안전한 칸을 찾았어요.");
      playSound("clear");
      session.complete();
    } else {
      setStatus("안전한 칸이에요.");
      playSound("correct", { feedback: false });
    }
  }

  function handleKeyDown(event, index) {
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      flagCell(index);
      return;
    }
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    const movement = {
      ArrowUp: row > 0 ? -SIZE : 0,
      ArrowDown: row < SIZE - 1 ? SIZE : 0,
      ArrowLeft: col > 0 ? -1 : 0,
      ArrowRight: col < SIZE - 1 ? 1 : 0,
    }[event.key];
    if (!movement) return;
    event.preventDefault();
    boardRef.current?.querySelector(`[data-index="${index + movement}"]`)?.focus();
  }

  const flags = board.filter((cell) => cell.state === MINE_CELL_STATE.FLAGGED).length;
  const revealed = board.filter((cell) => cell.state === MINE_CELL_STATE.REVEALED && !cell.isMine).length;

  return (
    <LogicPuzzleStage
      completionText="지뢰를 피해 모든 안전한 칸을 열었어요."
      failureText="지뢰를 밟았어요. 첫 칸은 다음 판에도 안전하게 시작됩니다."
      game={game}
      onReset={startGame}
      onStart={startGame}
      session={session}
      stats={[
        { label: "Mines", value: Math.max(0, MINE_COUNT - flags) },
        { label: "Open", value: revealed },
      ]}
    >
      <div className="minesweeper-game">
        <BoardViewport label="지뢰찾기 보드">
          <div
            className="minesweeper-board"
            ref={boardRef}
            role="grid"
            aria-label="9×9 지뢰찾기 보드"
          >
            {board.map((cell, index) => (
              <button
                aria-label={`${Math.floor(index / SIZE) + 1}행 ${index % SIZE + 1}열, ${
                  cell.state === MINE_CELL_STATE.FLAGGED
                    ? "깃발"
                    : cell.state === MINE_CELL_STATE.HIDDEN
                      ? "닫힘"
                      : cell.isMine ? "지뢰" : cell.adjacent ? `주변 지뢰 ${cell.adjacent}개` : "안전"
                }`}
                className={`minesweeper-cell is-${cell.state}${cell.isMine && cell.state === MINE_CELL_STATE.REVEALED ? " is-mine" : ""}`}
                data-adjacent={cell.adjacent || undefined}
                data-index={index}
                key={index}
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  revealCell(index);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  flagCell(index);
                }}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onPointerCancel={() => window.clearTimeout(longPressTimerRef.current)}
                onPointerDown={(event) => {
                  if (event.pointerType !== "touch") return;
                  longPressTimerRef.current = window.setTimeout(() => {
                    suppressClickRef.current = true;
                    flagCell(index);
                  }, 480);
                }}
                onPointerUp={() => window.clearTimeout(longPressTimerRef.current)}
                type="button"
              >
                {cell.state === MINE_CELL_STATE.FLAGGED
                  ? <FlagIcon />
                  : cell.state === MINE_CELL_STATE.REVEALED
                    ? cell.isMine ? "✦" : cell.adjacent || ""
                    : ""}
              </button>
            ))}
          </div>
        </BoardViewport>
        <div className="logic-board-toolbar">
          <Button
            aria-pressed={flagMode}
            size="small"
            variant={flagMode ? "primary" : "secondary"}
            onClick={() => setFlagMode((current) => !current)}
          >
            <FlagIcon />
            {flagMode ? "깃발 모드" : "칸 열기 모드"}
          </Button>
        </div>
        <p className="logic-board-status" role="status">{status}</p>
      </div>
    </LogicPuzzleStage>
  );
}
