import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import {
  COLOR_SORT_CAPACITY,
  COLOR_SORT_MAX_LEVEL,
  COLOR_SORT_PALETTE,
  createColorSortBoard,
  getColorSortLevel,
  isColorSortSolved,
  moveColorBlocks,
} from "./colorSort.logic.js";
import "./color-sort.css";

const COLOR_BY_ID = Object.fromEntries(COLOR_SORT_PALETTE.map((color) => [color.id, color.value]));
const COLOR_SORT_UNDO_LIMIT = 5;

export function ColorSortGame({ game }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const seedRef = useRef(1);
  const [phase, setPhase] = useState("idle");
  const [level, setLevel] = useState(1);
  const [tubes, setTubes] = useState([]);
  const [initialTubes, setInitialTubes] = useState([]);
  const [selectedTube, setSelectedTube] = useState(null);
  const [history, setHistory] = useState([]);
  const [undoRemaining, setUndoRemaining] = useState(COLOR_SORT_UNDO_LIMIT);
  const [moves, setMoves] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const config = getColorSortLevel(level);
  const completedTubes = useMemo(() => tubes.filter((tube) => (
    tube.length === COLOR_SORT_CAPACITY && tube.every((color) => color === tube[0])
  )).length, [tubes]);

  function createLevel(nextLevel) {
    seedRef.current += 1;
    const board = createColorSortBoard(nextLevel, nextLevel * 7919 + seedRef.current);
    setLevel(nextLevel);
    setTubes(board);
    setInitialTubes(board.map((tube) => [...tube]));
    setSelectedTube(null);
    setHistory([]);
    setUndoRemaining(COLOR_SORT_UNDO_LIMIT);
    setMoves(0);
    setPhase("playing");
  }

  function startGame() {
    setTotalMoves(0);
    setIsExitOpen(false);
    createLevel(1);
  }

  function chooseTube(index) {
    if (phase !== "playing") return;
    const tube = tubes[index];
    if (selectedTube == null) {
      if (!tube.length) return;
      playSound("correct");
      setSelectedTube(index);
      return;
    }

    if (selectedTube === index) {
      setSelectedTube(null);
      return;
    }

    const result = moveColorBlocks(tubes, selectedTube, index);
    if (!result.moved) {
      playSound("wrong");
      setSelectedTube(tube.length ? index : selectedTube);
      return;
    }

    playSound("correct");
    setHistory((current) => [...current, tubes.map((currentTube) => [...currentTube])]);
    setTubes(result.tubes);
    setMoves((current) => current + 1);
    setTotalMoves((current) => current + 1);
    setSelectedTube(null);

    if (!isColorSortSolved(result.tubes)) return;
    playSound(level === COLOR_SORT_MAX_LEVEL ? "clear" : "success");
    setPhase(level === COLOR_SORT_MAX_LEVEL ? "completed" : "level-clear");
  }

  function undoMove() {
    if (!history.length || !undoRemaining || phase !== "playing") return;
    const previous = history[history.length - 1];
    setTubes(previous);
    setHistory((current) => current.slice(0, -1));
    setMoves((current) => Math.max(0, current - 1));
    setTotalMoves((current) => Math.max(0, current - 1));
    setUndoRemaining((current) => Math.max(0, current - 1));
    setSelectedTube(null);
    playSound("correct");
  }

  function restartLevel() {
    setTubes(initialTubes.map((tube) => [...tube]));
    setSelectedTube(null);
    setHistory([]);
    setUndoRemaining(COLOR_SORT_UNDO_LIMIT);
    setTotalMoves((current) => Math.max(0, current - moves));
    setMoves(0);
    setPhase("playing");
  }

  function requestExit() {
    if (phase === "idle" || phase === "completed") {
      navigate("/");
      return;
    }
    setIsExitOpen(true);
  }

  const sidebar = (
    <div className="stat-row">
      <div className="stat"><div className="l">Level</div><div className="v">{level}/{COLOR_SORT_MAX_LEVEL}</div></div>
      <div className="stat"><div className="l">Colors</div><div className="v">{config.colorCount}</div></div>
      <div className="stat"><div className="l">Moves</div><div className="v">{moves}</div></div>
      <div className="stat"><div className="l">Complete</div><div className="v">{completedTubes}/{config.colorCount}</div></div>
    </div>
  );

  return (
    <GameStage
      actions={<Button variant="secondary" onClick={requestExit}>게임 나가기</Button>}
      ariaLabel="컬러 솔트 게임"
      className="color-sort"
      description={game.description}
      eyebrow="PUZZLE / COLOR"
      isExitConfirmationOpen={isExitOpen}
      onRequestExit={requestExit}
      sidebar={sidebar}
      title={game.title}
    >
      <div className="color-sort__game">
        <div className="color-sort__status" aria-live="polite">
          <span>{phase === "idle" ? "5 LEVELS" : `LEVEL ${level} · ${config.colorCount} COLORS`}</span>
          <strong>{phase === "idle" ? "같은 색끼리 모아보세요" : selectedTube == null ? "옮길 통을 선택하세요" : "도착할 통을 선택하세요"}</strong>
        </div>

        <div className="color-sort__board" data-tubes={config.tubeCount} aria-label="색상 정렬 보드">
          {(phase === "idle" ? Array.from({ length: 6 }, () => []) : tubes).map((tube, tubeIndex) => (
            <button
              aria-label={`${tubeIndex + 1}번 통, 블록 ${tube.length}개`}
              aria-pressed={selectedTube === tubeIndex}
              className={`color-sort__tube${selectedTube === tubeIndex ? " is-selected" : ""}`}
              disabled={phase !== "playing"}
              key={tubeIndex}
              onClick={() => chooseTube(tubeIndex)}
              type="button"
            >
              <span className="color-sort__tube-inner">
                {Array.from({ length: COLOR_SORT_CAPACITY }, (_, slot) => {
                  const colorId = tube[slot];
                  return (
                    <span
                      className={`color-sort__block${colorId ? " has-color" : ""}`}
                      key={slot}
                      style={colorId ? { "--block-color": COLOR_BY_ID[colorId] } : undefined}
                    />
                  );
                })}
              </span>
            </button>
          ))}
        </div>

        {phase === "playing" ? (
          <div className="color-sort__actions">
            <Button
              aria-label={`되돌리기, ${undoRemaining}회 남음`}
              variant="secondary"
              disabled={!history.length || !undoRemaining}
              onClick={undoMove}
            >
              되돌리기 {undoRemaining}
            </Button>
            <Button variant="secondary" onClick={restartLevel}>처음부터</Button>
          </div>
        ) : null}
      </div>

      {phase === "idle" ? (
        <GameStageOverlay state="start">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="color-start-title">
            <GameStageDoodle variant="start" />
            <div className="game-stage-modal__eyebrow">PUZZLE / COLOR</div>
            <h3 id="color-start-title">색을 정리해 볼까요?</h3>
            <p>같은 색 블록을 한 통에 모아 모든 통을 완성하세요.</p>
            <Button onClick={startGame}>게임 시작</Button>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === "level-clear" ? (
        <GameStageOverlay state="clear">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="color-level-title">
            <div className="game-stage-modal__eyebrow">LEVEL {level} CLEAR</div>
            <h3 id="color-level-title">{config.colorCount}가지 색을 모두 정리했어요!</h3>
            <p>{moves}번 이동했어요. 다음 레벨에는 색상이 하나 더 추가돼요.</p>
            <Button onClick={() => createLevel(level + 1)}>다음 레벨</Button>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === "completed" ? (
        <GameStageOverlay state="complete">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="color-complete-title">
            <div className="game-stage-modal__eyebrow">ALL COLORS COMPLETE</div>
            <h3 id="color-complete-title">Color Sort 완료!</h3>
            <p>8가지 색상을 총 {totalMoves}번 이동해 모두 정리했어요.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={startGame}>다시 도전</Button>
              <Button variant="secondary" onClick={() => navigate("/")}>홈으로</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {isExitOpen ? (
        <GameStageOverlay state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="color-exit-title">
            <div className="game-stage-modal__eyebrow">LEAVE GAME</div>
            <h3 id="color-exit-title">퍼즐을 나갈까요?</h3>
            <p>현재 레벨의 정렬 상태는 저장되지 않아요.</p>
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
