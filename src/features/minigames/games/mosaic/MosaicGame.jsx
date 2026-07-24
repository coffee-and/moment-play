import { useMemo, useState } from "react";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { BoardViewport } from "../../shared/components/BoardViewport.jsx";
import { LogicPuzzleStage } from "../../shared/components/LogicPuzzleStage.jsx";
import { usePuzzleHints } from "../../shared/hooks/usePuzzleHints.js";
import { usePuzzleSession } from "../../shared/hooks/usePuzzleSession.js";
import {
  getMosaicClueState,
  getMosaicNeighbors,
  isMosaicSolved,
  MOSAIC_CELL_STATE,
  MOSAIC_PUZZLES,
} from "./mosaic.logic.js";
import "./mosaic.css";

const MOSAIC_BEST_KEY = "eunContents.mosaic.bestTime";

export function MosaicGame({ game }) {
  const { playSound } = useGameAudio();
  const session = usePuzzleSession(MOSAIC_BEST_KEY);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [board, setBoard] = useState(() => Array(64).fill(MOSAIC_CELL_STATE.UNKNOWN));
  const [mode, setMode] = useState(MOSAIC_CELL_STATE.FILLED);
  const [status, setStatus] = useState("숫자는 자신을 포함한 주변 3×3 안의 검은 칸 수예요.");
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const puzzle = MOSAIC_PUZZLES[puzzleIndex];
  const targetIndex = board.findIndex((cell, index) => (
    puzzle.solution[index] === MOSAIC_CELL_STATE.FILLED
      ? cell !== MOSAIC_CELL_STATE.FILLED
      : cell === MOSAIC_CELL_STATE.FILLED
  ));
  const safeTargetIndex = targetIndex >= 0 ? targetIndex : 0;
  const targetNeighbors = getMosaicNeighbors(safeTargetIndex, puzzle.size);
  const targetRow = Math.floor(safeTargetIndex / puzzle.size) + 1;
  const targetCol = safeTargetIndex % puzzle.size + 1;
  const hint = usePuzzleHints([
    {
      message: `${targetRow}행 ${targetCol}열 주변의 숫자 단서를 함께 비교해보세요.`,
      targetIndexes: targetNeighbors,
    },
    {
      message: "숫자는 자기 칸을 포함한 주변 3×3 안에서 칠해야 하는 칸의 총개수예요.",
      targetIndexes: targetNeighbors,
    },
    {
      message: `${targetRow}행 ${targetCol}열은 ${puzzle.solution[safeTargetIndex] === MOSAIC_CELL_STATE.FILLED ? "칠하는" : "비워 두는"} 칸이에요.`,
      targetIndexes: [safeTargetIndex],
    },
  ]);

  const clueStates = useMemo(
    () => puzzle.clues.map((_, index) => getMosaicClueState(board, puzzle.clues, index, puzzle.size)),
    [board, puzzle],
  );

  function resetBoard(nextPuzzleIndex = puzzleIndex) {
    setPuzzleIndex(nextPuzzleIndex);
    setBoard(Array(puzzle.size * puzzle.size).fill(MOSAIC_CELL_STATE.UNKNOWN));
    setMode(MOSAIC_CELL_STATE.FILLED);
    setIsAnswerRevealed(false);
    setStatus("숫자는 자신을 포함한 주변 3×3 안의 검은 칸 수예요.");
    hint.resetHints();
    session.start();
  }

  function changeCell(index, nextMode = mode) {
    if (session.phase !== "playing" || isAnswerRevealed) return;
    const nextBoard = board.map((cell, cellIndex) => {
      if (cellIndex !== index) return cell;
      return cell === nextMode ? MOSAIC_CELL_STATE.UNKNOWN : nextMode;
    });
    setBoard(nextBoard);
    if (isMosaicSolved(nextBoard, puzzle.solution)) {
      setStatus("숨겨진 그림을 완성했어요.");
      playSound("clear");
      session.complete();
      return;
    }
    const nextClueStates = puzzle.clues.map((_, clueIndex) => (
      getMosaicClueState(nextBoard, puzzle.clues, clueIndex, puzzle.size)
    ));
    if (nextClueStates.includes("conflict")) {
      setStatus("주변 칸 수가 맞지 않는 숫자가 있어요.");
      playSound("wrong");
    } else {
      setStatus("좋아요. 주변 숫자를 함께 비교해보세요.");
      playSound("correct");
    }
  }

  function revealAnswer() {
    setBoard(puzzle.solution.map((cell) => (
      cell === MOSAIC_CELL_STATE.FILLED ? MOSAIC_CELL_STATE.FILLED : MOSAIC_CELL_STATE.MARKED
    )));
    setIsAnswerRevealed(true);
    setStatus("정답 그림을 표시했어요. 각 숫자 주변의 칠한 칸 수를 확인해보세요.");
  }

  const filledCount = board.filter((cell) => cell === MOSAIC_CELL_STATE.FILLED).length;
  const satisfied = clueStates.filter((state) => state === "satisfied").length;

  return (
    <LogicPuzzleStage
      completionText="숫자 단서를 모두 맞춰 숨겨진 픽셀 그림을 완성했어요."
      endOnSurrender
      game={game}
      hint={hint}
      onReset={() => resetBoard((puzzleIndex + 1) % MOSAIC_PUZZLES.length)}
      onStart={() => resetBoard(puzzleIndex)}
      onSurrender={revealAnswer}
      session={session}
      stats={[
        { label: "Filled", value: filledCount },
        { label: "Clues", value: `${satisfied}/${puzzle.clues.length}` },
      ]}
    >
      <div className="mosaic-game">
        <BoardViewport label="모자이크 보드">
          <div className="mosaic-board" role="grid" aria-label="8×8 모자이크 보드">
            {board.map((cell, index) => (
              <button
                aria-label={`${Math.floor(index / puzzle.size) + 1}행 ${index % puzzle.size + 1}열, 단서 ${puzzle.clues[index]}`}
                aria-pressed={cell === MOSAIC_CELL_STATE.FILLED}
                className={`mosaic-cell state-${cell} clue-${clueStates[index]} ${hint.currentStep?.targetIndexes?.includes(index) ? "is-hint-target" : ""}`}
                disabled={isAnswerRevealed}
                key={index}
                onClick={() => changeCell(index)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  changeCell(index, MOSAIC_CELL_STATE.MARKED);
                }}
                type="button"
              >
                <span>{puzzle.clues[index]}</span>
              </button>
            ))}
          </div>
        </BoardViewport>
        <div className="logic-board-toolbar">
          <Button
            aria-pressed={mode === MOSAIC_CELL_STATE.FILLED}
            size="small"
            variant={mode === MOSAIC_CELL_STATE.FILLED ? "primary" : "secondary"}
            onClick={() => setMode(MOSAIC_CELL_STATE.FILLED)}
          >
            ■ 칠하기
          </Button>
          <Button
            aria-pressed={mode === MOSAIC_CELL_STATE.MARKED}
            size="small"
            variant={mode === MOSAIC_CELL_STATE.MARKED ? "primary" : "secondary"}
            onClick={() => setMode(MOSAIC_CELL_STATE.MARKED)}
          >
            × 비우기
          </Button>
        </div>
        <p className="logic-board-status" role="status">{status}</p>
      </div>
    </LogicPuzzleStage>
  );
}
