import { useMemo, useState } from "react";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { BoardViewport } from "../../shared/components/BoardViewport.jsx";
import { LogicPuzzleStage } from "../../shared/components/LogicPuzzleStage.jsx";
import { usePuzzleHints } from "../../shared/hooks/usePuzzleHints.js";
import { usePuzzleSession } from "../../shared/hooks/usePuzzleSession.js";
import {
  createRectangle,
  isShikakuComplete,
  rectangleContains,
  SHIKAKU_PUZZLES,
  solveShikaku,
  validateShikakuRectangle,
} from "./shikaku.logic.js";
import "./shikaku.css";

const SHIKAKU_BEST_KEY = "eunContents.shikaku.bestTime";

export function ShikakuGame({ game }) {
  const { playSound } = useGameAudio();
  const session = usePuzzleSession(SHIKAKU_BEST_KEY);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [rectangles, setRectangles] = useState([]);
  const [anchor, setAnchor] = useState(null);
  const [status, setStatus] = useState("첫 번째 칸과 반대쪽 모서리를 차례로 선택하세요.");
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const puzzle = SHIKAKU_PUZZLES[puzzleIndex];
  const solution = useMemo(() => solveShikaku(puzzle), [puzzle]);
  const targetRectangle = solution.find((answer) => !rectangles.some((rectangle) => (
    rectangle.top === answer.top
    && rectangle.bottom === answer.bottom
    && rectangle.left === answer.left
    && rectangle.right === answer.right
  ))) ?? solution[0];
  const targetClue = targetRectangle
    ? puzzle.clues.find((clue) => rectangleContains(targetRectangle, clue.row, clue.col))
    : null;
  const hint = usePuzzleHints(targetRectangle ? [
    {
      message: `${targetClue.value}가 있는 칸부터 살펴보세요. 사각형의 넓이는 ${targetClue.value}칸이어야 해요.`,
      targetRectangle: { ...targetClue, top: targetClue.row, bottom: targetClue.row, left: targetClue.col, right: targetClue.col },
    },
    {
      message: `${targetClue.value}칸을 만들 수 있는 가로×세로 조합을 비교하고, 다른 숫자가 들어오지 않는 범위를 찾으세요.`,
      targetRectangle,
    },
    {
      message: "표시된 범위의 양쪽 모서리를 차례로 선택하면 정답 사각형이 완성돼요.",
      targetRectangle,
    },
  ] : []);
  const cells = useMemo(
    () => Array.from({ length: puzzle.size * puzzle.size }, (_, index) => ({
      row: Math.floor(index / puzzle.size),
      col: index % puzzle.size,
    })),
    [puzzle.size],
  );

  function resetBoard(nextPuzzleIndex = puzzleIndex) {
    setPuzzleIndex(nextPuzzleIndex);
    setRectangles([]);
    setAnchor(null);
    setIsAnswerRevealed(false);
    setStatus("첫 번째 칸과 반대쪽 모서리를 차례로 선택하세요.");
    hint.resetHints();
    session.start();
  }

  function handleCell(row, col) {
    if (session.phase !== "playing" || isAnswerRevealed) return;
    const claimedIndex = rectangles.findIndex((rectangle) => rectangleContains(rectangle, row, col));
    if (claimedIndex >= 0) {
      setRectangles((current) => current.filter((_, index) => index !== claimedIndex));
      setAnchor(null);
      setStatus("선택한 사각형을 지웠어요.");
      playSound("correct");
      return;
    }
    if (!anchor) {
      setAnchor({ row, col });
      setStatus("반대쪽 모서리를 선택하세요.");
      return;
    }

    const rectangle = createRectangle(anchor, { row, col });
    const result = validateShikakuRectangle(rectangle, puzzle.clues, rectangles);
    setAnchor(null);
    if (!result.valid) {
      setStatus(result.reason);
      playSound("wrong");
      return;
    }

    const nextRectangles = [...rectangles, rectangle];
    setRectangles(nextRectangles);
    playSound("correct");
    if (isShikakuComplete(puzzle.size, nextRectangles)) {
      setStatus("모든 칸을 정확한 사각형으로 나눴어요.");
      session.complete();
      playSound("clear");
    } else {
      setStatus("좋아요. 다음 사각형을 만들어보세요.");
    }
  }

  function revealAnswer() {
    setRectangles(solution);
    setAnchor(null);
    setIsAnswerRevealed(true);
    setStatus("정답 사각형을 표시했어요. 각 영역에 숫자가 하나만 있는지 확인해보세요.");
  }

  return (
    <LogicPuzzleStage
      completionText="모든 숫자에 맞춰 보드를 사각형으로 나눴어요."
      endOnSurrender
      game={game}
      hint={hint}
      onReset={() => resetBoard((puzzleIndex + 1) % SHIKAKU_PUZZLES.length)}
      onStart={() => resetBoard(puzzleIndex)}
      onSurrender={revealAnswer}
      session={session}
      stats={[{ label: "Areas", value: `${rectangles.length}/${puzzle.clues.length}` }]}
    >
      <div className="shikaku-game">
        <BoardViewport label="시카쿠 보드">
          <div
            className="shikaku-board"
            role="grid"
            aria-label={`${puzzle.size}×${puzzle.size} 시카쿠 보드`}
            style={{ "--shikaku-size": puzzle.size }}
          >
            {cells.map(({ row, col }) => {
              const clue = puzzle.clues.find((item) => item.row === row && item.col === col);
              const rectangleIndex = rectangles.findIndex((rectangle) => rectangleContains(rectangle, row, col));
              const rectangle = rectangles[rectangleIndex];
              const edgeClasses = rectangle
                ? [
                  row === rectangle.top ? "is-top" : "",
                  row === rectangle.bottom ? "is-bottom" : "",
                  col === rectangle.left ? "is-left" : "",
                  col === rectangle.right ? "is-right" : "",
                ].filter(Boolean).join(" ")
                : "";
              const isAnchor = anchor?.row === row && anchor?.col === col;
              const isHintTarget = hint.currentStep?.targetRectangle
                ? rectangleContains(hint.currentStep.targetRectangle, row, col)
                : false;
              return (
                <button
                  aria-label={`${row + 1}행 ${col + 1}열${clue ? `, 숫자 ${clue.value}` : ""}`}
                  aria-pressed={Boolean(rectangle)}
                  className={`shikaku-cell ${rectangle ? `is-claimed region-${rectangleIndex % 6}` : ""} ${edgeClasses} ${isAnchor ? "is-anchor" : ""} ${isHintTarget ? "is-hint-target" : ""}`}
                  disabled={isAnswerRevealed}
                  key={`${row}-${col}`}
                  onClick={() => handleCell(row, col)}
                  type="button"
                >
                  {clue?.value ?? ""}
                </button>
              );
            })}
          </div>
        </BoardViewport>
        <p className="logic-board-status" role="status">{status}</p>
      </div>
    </LogicPuzzleStage>
  );
}
