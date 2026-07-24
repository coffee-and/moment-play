import { useState } from "react";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { BoardViewport } from "../../shared/components/BoardViewport.jsx";
import { LogicPuzzleStage } from "../../shared/components/LogicPuzzleStage.jsx";
import { usePuzzleHints } from "../../shared/hooks/usePuzzleHints.js";
import { usePuzzleSession } from "../../shared/hooks/usePuzzleSession.js";
import { LITS_REGION_MAP, LITS_SIZE, LITS_SOLUTION, validateLits } from "./lits.logic.js";
import "./lits.css";

const LITS_BEST_KEY = "eunContents.lits.bestTime";
const UNKNOWN = 0;
const FILLED = 1;
const MARKED = 2;

export function LitsGame({ game }) {
  const { playSound } = useGameAudio();
  const session = usePuzzleSession(LITS_BEST_KEY);
  const [board, setBoard] = useState(() => Array(LITS_SIZE * LITS_SIZE).fill(UNKNOWN));
  const [mode, setMode] = useState(FILLED);
  const [status, setStatus] = useState("각 영역에 L·I·T·S 모양 중 하나를 네 칸으로 만드세요.");
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const solutionSet = new Set(LITS_SOLUTION);
  const targetRegion = [...new Set(LITS_REGION_MAP)].find((regionId) => (
    board.some((cell, index) => (
      LITS_REGION_MAP[index] === regionId
      && (cell === FILLED) !== solutionSet.has(index)
    ))
  )) ?? 0;
  const targetRegionIndexes = LITS_REGION_MAP
    .map((regionId, index) => regionId === targetRegion ? index : null)
    .filter((index) => index != null);
  const targetSolutionIndexes = targetRegionIndexes.filter((index) => solutionSet.has(index));
  const hint = usePuzzleHints([
    {
      message: `${targetRegion + 1}번 영역부터 살펴보세요. 이 영역에서도 정확히 네 칸이 이어져야 해요.`,
      targetIndexes: targetRegionIndexes,
    },
    {
      message: "네 칸은 L·I·T·S 중 한 모양이며, 이웃 영역의 같은 모양과 변으로 닿으면 안 돼요.",
      targetIndexes: targetRegionIndexes,
    },
    {
      message: `${targetRegion + 1}번 영역에서 표시한 네 칸을 칠해보세요.`,
      targetIndexes: targetSolutionIndexes,
    },
  ]);

  function startGame() {
    setBoard(Array(LITS_SIZE * LITS_SIZE).fill(UNKNOWN));
    setMode(FILLED);
    setIsAnswerRevealed(false);
    setStatus("각 영역에 L·I·T·S 모양 중 하나를 네 칸으로 만드세요.");
    hint.resetHints();
    session.start();
  }

  function changeCell(index, nextMode = mode) {
    if (session.phase !== "playing" || isAnswerRevealed) return;
    const regionId = LITS_REGION_MAP[index];
    const regionFilled = board.filter((cell, cellIndex) => (
      LITS_REGION_MAP[cellIndex] === regionId && cell === FILLED
    )).length;
    if (nextMode === FILLED && board[index] !== FILLED && regionFilled >= 4) {
      setStatus("한 영역에는 네 칸까지만 칠할 수 있어요.");
      playSound("wrong");
      return;
    }

    const nextBoard = board.map((cell, cellIndex) => {
      if (cellIndex !== index) return cell;
      return cell === nextMode ? UNKNOWN : nextMode;
    });
    setBoard(nextBoard);
    const filledIndexes = nextBoard
      .map((cell, cellIndex) => cell === FILLED ? cellIndex : null)
      .filter((cellIndex) => cellIndex != null);
    const everyRegionHasFour = [...new Set(LITS_REGION_MAP)].every((currentRegion) => (
      filledIndexes.filter((cellIndex) => LITS_REGION_MAP[cellIndex] === currentRegion).length === 4
    ));
    if (!everyRegionHasFour) {
      setStatus("영역마다 네 칸을 이어서 칠해보세요.");
      playSound("correct");
      return;
    }
    const result = validateLits(filledIndexes);
    if (!result.valid) {
      setStatus(result.reason);
      playSound("wrong");
      return;
    }
    setStatus("모든 LITS 규칙을 만족했어요.");
    playSound("clear");
    session.complete();
  }

  function revealAnswer() {
    setBoard(Array.from({ length: LITS_SIZE * LITS_SIZE }, (_, index) => (
      solutionSet.has(index) ? FILLED : MARKED
    )));
    setIsAnswerRevealed(true);
    setStatus("정답을 표시했어요. 영역별 네 칸의 모양과 연결 방식을 확인해보세요.");
  }

  const filledCount = board.filter((cell) => cell === FILLED).length;
  const completedRegions = [...new Set(LITS_REGION_MAP)].filter((regionId) => (
    board.filter((cell, index) => LITS_REGION_MAP[index] === regionId && cell === FILLED).length === 4
  )).length;

  return (
    <LogicPuzzleStage
      completionText="모든 영역의 테트로미노를 하나로 연결했어요."
      endOnSurrender
      game={game}
      hint={hint}
      onReset={startGame}
      onStart={startGame}
      onSurrender={revealAnswer}
      session={session}
      stats={[
        { label: "Cells", value: `${filledCount}/24` },
        { label: "Areas", value: `${completedRegions}/6` },
      ]}
    >
      <div className="lits-game">
        <BoardViewport label="LITS 보드">
          <div className="lits-board" role="grid" aria-label="6×6 LITS 보드">
            {board.map((cell, index) => {
              const row = Math.floor(index / LITS_SIZE);
              const col = index % LITS_SIZE;
              const region = LITS_REGION_MAP[index];
              const topEdge = row === 0 || LITS_REGION_MAP[index - LITS_SIZE] !== region;
              const rightEdge = col === LITS_SIZE - 1 || LITS_REGION_MAP[index + 1] !== region;
              const bottomEdge = row === LITS_SIZE - 1 || LITS_REGION_MAP[index + LITS_SIZE] !== region;
              const leftEdge = col === 0 || LITS_REGION_MAP[index - 1] !== region;
              return (
                <button
                  aria-label={`${row + 1}행 ${col + 1}열, 영역 ${region + 1}`}
                  aria-pressed={cell === FILLED}
                  className={`lits-cell state-${cell} region-${region} ${topEdge ? "edge-top" : ""} ${rightEdge ? "edge-right" : ""} ${bottomEdge ? "edge-bottom" : ""} ${leftEdge ? "edge-left" : ""} ${hint.currentStep?.targetIndexes?.includes(index) ? "is-hint-target" : ""}`}
                  disabled={isAnswerRevealed}
                  key={index}
                  onClick={() => changeCell(index)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    changeCell(index, MARKED);
                  }}
                  type="button"
                />
              );
            })}
          </div>
        </BoardViewport>
        <div className="logic-board-toolbar">
          <Button
            aria-pressed={mode === FILLED}
            size="small"
            variant={mode === FILLED ? "primary" : "secondary"}
            onClick={() => setMode(FILLED)}
          >
            ■ 칠하기
          </Button>
          <Button
            aria-pressed={mode === MARKED}
            size="small"
            variant={mode === MARKED ? "primary" : "secondary"}
            onClick={() => setMode(MARKED)}
          >
            × 제외
          </Button>
        </div>
        <p className="logic-board-status" role="status">{status}</p>
      </div>
    </LogicPuzzleStage>
  );
}
