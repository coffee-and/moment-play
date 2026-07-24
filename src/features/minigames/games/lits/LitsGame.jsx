import { useState } from "react";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { BoardViewport } from "../../shared/components/BoardViewport.jsx";
import { LogicPuzzleStage } from "../../shared/components/LogicPuzzleStage.jsx";
import { usePuzzleHints } from "../../shared/hooks/usePuzzleHints.js";
import { usePuzzleSession } from "../../shared/hooks/usePuzzleSession.js";
import { LITS_PUZZLES, validateLits } from "./lits.logic.js";
import "./lits.css";

const LITS_BEST_KEY = "eunContents.lits.bestTime";
const UNKNOWN = 0;
const FILLED = 1;
const MARKED = 2;

export function LitsGame({ game }) {
  const { playSound } = useGameAudio();
  const session = usePuzzleSession(LITS_BEST_KEY);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle = LITS_PUZZLES[puzzleIndex];
  const [board, setBoard] = useState(() => Array(LITS_PUZZLES[0].size ** 2).fill(UNKNOWN));
  const [mode, setMode] = useState(FILLED);
  const [status, setStatus] = useState("각 영역에 L·I·T·S 모양 중 하나를 네 칸으로 만드세요.");
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const solutionSet = new Set(puzzle.solution);
  const targetRegion = [...new Set(puzzle.regionMap)].find((regionId) => (
    board.some((cell, index) => (
      puzzle.regionMap[index] === regionId
      && (cell === FILLED) !== solutionSet.has(index)
    ))
  )) ?? 0;
  const targetRegionIndexes = puzzle.regionMap
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

  function startGame(nextPuzzleIndex = puzzleIndex, preserveStreak = false) {
    const nextPuzzle = LITS_PUZZLES[nextPuzzleIndex];
    setPuzzleIndex(nextPuzzleIndex);
    setBoard(Array(nextPuzzle.size ** 2).fill(UNKNOWN));
    setMode(FILLED);
    setIsAnswerRevealed(false);
    setStatus("각 영역에 L·I·T·S 모양 중 하나를 네 칸으로 만드세요.");
    hint.resetHints();
    if (preserveStreak) session.startNextRound();
    else session.start();
  }

  function changeCell(index, nextMode = mode) {
    if (session.phase !== "playing" || isAnswerRevealed) return;
    const regionId = puzzle.regionMap[index];
    const regionFilled = board.filter((cell, cellIndex) => (
      puzzle.regionMap[cellIndex] === regionId && cell === FILLED
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
    const everyRegionHasFour = [...new Set(puzzle.regionMap)].every((currentRegion) => (
      filledIndexes.filter((cellIndex) => puzzle.regionMap[cellIndex] === currentRegion).length === 4
    ));
    if (!everyRegionHasFour) {
      setStatus("영역마다 네 칸을 이어서 칠해보세요.");
      playSound("correct");
      return;
    }
    const result = validateLits(filledIndexes, puzzle.regionMap, puzzle.size);
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
    setBoard(Array.from({ length: puzzle.size ** 2 }, (_, index) => (
      solutionSet.has(index) ? FILLED : MARKED
    )));
    setIsAnswerRevealed(true);
    setStatus("정답을 표시했어요. 영역별 네 칸의 모양과 연결 방식을 확인해보세요.");
  }

  const filledCount = board.filter((cell) => cell === FILLED).length;
  const completedRegions = [...new Set(puzzle.regionMap)].filter((regionId) => (
    board.filter((cell, index) => puzzle.regionMap[index] === regionId && cell === FILLED).length === 4
  )).length;

  return (
    <LogicPuzzleStage
      completionText="모든 영역의 테트로미노를 하나로 연결했어요."
      endOnSurrender
      game={game}
      hint={hint}
      onNextRound={() => startGame((puzzleIndex + 1) % LITS_PUZZLES.length, true)}
      onReset={() => startGame(puzzleIndex)}
      onStart={() => startGame(puzzleIndex)}
      onSurrender={revealAnswer}
      session={session}
      stats={[
        { label: "Puzzle", value: `${puzzleIndex + 1}/${LITS_PUZZLES.length}` },
        { label: "Cells", value: `${filledCount}/${puzzle.solution.length}` },
        { label: "Areas", value: `${completedRegions}/${new Set(puzzle.regionMap).size}` },
      ]}
    >
      <div className="lits-game">
        <BoardViewport label="LITS 보드">
          <div
            className="lits-board"
            data-puzzle-id={puzzle.id}
            role="grid"
            aria-label={`${puzzle.size}×${puzzle.size} LITS 보드, ${puzzleIndex + 1}번 퍼즐`}
          >
            {board.map((cell, index) => {
              const row = Math.floor(index / puzzle.size);
              const col = index % puzzle.size;
              const region = puzzle.regionMap[index];
              const topEdge = row === 0 || puzzle.regionMap[index - puzzle.size] !== region;
              const rightEdge = col === puzzle.size - 1 || puzzle.regionMap[index + 1] !== region;
              const bottomEdge = row === puzzle.size - 1 || puzzle.regionMap[index + puzzle.size] !== region;
              const leftEdge = col === 0 || puzzle.regionMap[index - 1] !== region;
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
