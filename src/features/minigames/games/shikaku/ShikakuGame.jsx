import { useMemo, useState } from "react";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { BoardViewport } from "../../shared/components/BoardViewport.jsx";
import { LogicPuzzleStage } from "../../shared/components/LogicPuzzleStage.jsx";
import { usePuzzleSession } from "../../shared/hooks/usePuzzleSession.js";
import {
  createRectangle,
  isShikakuComplete,
  rectangleContains,
  SHIKAKU_PUZZLES,
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
  const puzzle = SHIKAKU_PUZZLES[puzzleIndex];
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
    setStatus("첫 번째 칸과 반대쪽 모서리를 차례로 선택하세요.");
    session.start();
  }

  function handleCell(row, col) {
    if (session.phase !== "playing") return;
    const claimedIndex = rectangles.findIndex((rectangle) => rectangleContains(rectangle, row, col));
    if (claimedIndex >= 0) {
      setRectangles((current) => current.filter((_, index) => index !== claimedIndex));
      setAnchor(null);
      setStatus("선택한 사각형을 지웠어요.");
      playSound("correct", { feedback: false });
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

  return (
    <LogicPuzzleStage
      completionText="모든 숫자에 맞춰 보드를 사각형으로 나눴어요."
      game={game}
      onReset={() => resetBoard((puzzleIndex + 1) % SHIKAKU_PUZZLES.length)}
      onStart={() => resetBoard(puzzleIndex)}
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
              return (
                <button
                  aria-label={`${row + 1}행 ${col + 1}열${clue ? `, 숫자 ${clue.value}` : ""}`}
                  aria-pressed={Boolean(rectangle)}
                  className={`shikaku-cell ${rectangle ? `is-claimed region-${rectangleIndex % 6}` : ""} ${edgeClasses} ${isAnchor ? "is-anchor" : ""}`}
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
