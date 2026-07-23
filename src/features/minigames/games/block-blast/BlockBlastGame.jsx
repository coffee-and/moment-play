import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  TrophyIcon,
} from "../../../../shared/components/icons/PhosphorIcons.jsx";
import { GameIconButton } from "../../shared/components/GameIconButton.jsx";
import { GameGuideContent } from "../../shared/components/GameGuide.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import {
  BLOCK_BLAST_SIZE,
  canPlaceBlockPiece,
  createBlockBoard,
  createBlockPieces,
  hasBlockMove,
  placeBlockPiece,
} from "./blockBlast.logic.js";
import "./block-blast.css";

const BLOCK_BLAST_BEST_KEY = "eunContents.blockBlast.bestScore";

function readBestScore() {
  try {
    const value = Number(window.localStorage.getItem(BLOCK_BLAST_BEST_KEY));
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    window.localStorage.setItem(BLOCK_BLAST_BEST_KEY, String(score));
  } catch {
    // Local records are optional.
  }
}

export function BlockBlastGame({ game }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const [phase, setPhase] = useState("idle");
  const [board, setBoard] = useState(createBlockBoard);
  const [pieces, setPieces] = useState(() => createBlockPieces());
  const [selectedPieceIndex, setSelectedPieceIndex] = useState(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(readBestScore);
  const [combo, setCombo] = useState(0);
  const [status, setStatus] = useState("조각을 고른 뒤 보드에 놓아보세요.");
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [previewOrigin, setPreviewOrigin] = useState(null);
  const dragPieceIndexRef = useRef(null);
  const selectedPiece = selectedPieceIndex == null ? null : pieces[selectedPieceIndex];
  const previewIsValid = Boolean(
    selectedPiece
    && previewOrigin
    && canPlaceBlockPiece(board, selectedPiece, previewOrigin.row, previewOrigin.col),
  );
  const previewIndexes = new Set(
    selectedPiece && previewOrigin
      ? selectedPiece.cells
        .map(([rowOffset, colOffset]) => {
          const row = previewOrigin.row + rowOffset;
          const col = previewOrigin.col + colOffset;
          return row >= 0 && row < BLOCK_BLAST_SIZE && col >= 0 && col < BLOCK_BLAST_SIZE
            ? row * BLOCK_BLAST_SIZE + col
            : null;
        })
        .filter((index) => index != null)
      : [],
  );

  function startGame() {
    setBoard(createBlockBoard());
    setPieces(createBlockPieces());
    setSelectedPieceIndex(null);
    setScore(0);
    setCombo(0);
    setStatus("조각을 고른 뒤 보드에 놓아보세요.");
    setIsExitOpen(false);
    setPreviewOrigin(null);
    setPhase("playing");
  }

  function finishGame(finalScore) {
    setPhase("gameover");
    playSound("wrong");
    if (finalScore > bestScore) {
      setBestScore(finalScore);
      saveBestScore(finalScore);
    }
  }

  function placeSelected(row, col, explicitPieceIndex = selectedPieceIndex) {
    if (phase !== "playing" || explicitPieceIndex == null || !pieces[explicitPieceIndex]) return;
    const result = placeBlockPiece(board, pieces[explicitPieceIndex], row, col);
    if (!result.placed) {
      setStatus("그 자리에는 조각을 놓을 수 없어요.");
      playSound("wrong");
      return;
    }

    const nextCombo = result.clearedLines > 0 ? combo + 1 : 0;
    const nextScore = score + result.points + (result.clearedLines > 0 ? nextCombo * 3 : 0);
    let nextPieces = pieces.map((piece, index) => index === explicitPieceIndex ? null : piece);
    if (nextPieces.every((piece) => piece == null)) nextPieces = createBlockPieces();
    setBoard(result.board);
    setPieces(nextPieces);
    setSelectedPieceIndex(null);
    setPreviewOrigin(null);
    setScore(nextScore);
    setCombo(nextCombo);
    setStatus(result.clearedLines > 0 ? `${result.clearedLines}줄을 지웠어요!` : "좋아요. 다음 조각을 놓아보세요.");
    playSound(result.clearedLines > 0 ? "clear" : "correct");
    if (!hasBlockMove(result.board, nextPieces)) finishGame(nextScore);
  }

  function requestExit() {
    if (phase === "idle" || phase === "gameover") {
      navigate("/");
      return;
    }
    setIsExitOpen(true);
    setPhase("paused");
  }

  function pauseGame() {
    if (phase !== "playing") return;
    setPhase("paused");
  }

  function resumeGame() {
    if (phase !== "paused" || isExitOpen) return;
    setPhase("playing");
  }

  function continueGame() {
    setIsExitOpen(false);
    setPhase("playing");
  }

  function selectPiece(pieceIndex) {
    const piece = pieces[pieceIndex];
    if (phase !== "playing" || !piece) return;
    setSelectedPieceIndex(pieceIndex);
    setPreviewOrigin(null);
    setStatus(`${piece.cells.length}칸 블록을 선택했어요. 보드의 점 표시가 있는 칸에 놓아보세요.`);
  }

  const sidebar = (
    <div className="stat-row">
      <div className="stat"><div className="l">Score</div><div className="v">{score}</div></div>
      <div className="stat"><div className="l">Best</div><div className="v">{bestScore}</div></div>
      <div className="stat"><div className="l">Combo</div><div className="v">×{combo}</div></div>
    </div>
  );

  return (
    <GameStage
      actions={(
        <>
          {phase === "playing" ? (
            <GameIconButton label="게임 일시정지" onClick={pauseGame}>
              <PauseIcon />
            </GameIconButton>
          ) : null}
          {phase === "paused" && !isExitOpen ? (
            <GameIconButton label="게임 계속하기" onClick={resumeGame}>
              <PlayIcon />
            </GameIconButton>
          ) : null}
          <GameIconButton label="게임 나가기" onClick={requestExit}>
            <CloseIcon />
          </GameIconButton>
        </>
      )}
      ariaLabel="블록 블라스트 게임"
      className="block-blast-game"
      description={game.description}
      eyebrow="BLOCK / SCORE"
      isExitConfirmationOpen={isExitOpen}
      onRequestExit={requestExit}
      phase={phase}
      sidebar={sidebar}
      title={game.title}
      topbarMeta={(
        <span aria-label={`현재 점수 ${score}점`}>
          <TrophyIcon />
          {score}
        </span>
      )}
    >
      <div className="block-blast-layout">
        <div
          className="block-blast-board"
          role="grid"
          aria-label="8×8 블록 보드"
          onDragOver={(event) => event.preventDefault()}
          onPointerLeave={() => setPreviewOrigin(null)}
        >
          {board.map((value, index) => {
            const row = Math.floor(index / BLOCK_BLAST_SIZE);
            const col = index % BLOCK_BLAST_SIZE;
            const isValidOrigin = Boolean(selectedPiece && canPlaceBlockPiece(board, selectedPiece, row, col));
            const isPreview = previewIndexes.has(index);
            return (
              <button
                aria-label={`${row + 1}행 ${col + 1}열${value ? ", 채워짐" : ", 비어 있음"}${
                  selectedPiece ? isValidOrigin ? ", 선택한 블록을 놓을 수 있음" : ", 선택한 블록을 놓을 수 없음" : ""
                }`}
                className={`block-blast-cell${value ? ` is-filled color-${value}` : ""}${
                  isValidOrigin ? " is-valid-origin" : ""
                }${isPreview ? previewIsValid ? ` is-preview color-${selectedPiece.color}` : " is-invalid-preview" : ""}`}
                key={index}
                onClick={() => placeSelected(row, col)}
                onFocus={() => setPreviewOrigin({ row, col })}
                onDragEnter={() => setPreviewOrigin({ row, col })}
                onDrop={(event) => {
                  event.preventDefault();
                  placeSelected(row, col, dragPieceIndexRef.current);
                  dragPieceIndexRef.current = null;
                  setPreviewOrigin(null);
                }}
                onPointerEnter={() => setPreviewOrigin({ row, col })}
                type="button"
              />
            );
          })}
        </div>

        <div className="block-blast-tray" aria-label="사용할 블록">
          {pieces.map((piece, pieceIndex) => (
            <button
              aria-label={piece ? `${piece.cells.length}칸 블록 선택` : "사용한 블록"}
              aria-pressed={selectedPieceIndex === pieceIndex}
              className={`block-piece${selectedPieceIndex === pieceIndex ? " is-selected" : ""}`}
              disabled={!piece || phase !== "playing"}
              draggable={Boolean(piece)}
              key={piece?.instanceId ?? `used-${pieceIndex}`}
              onClick={() => selectPiece(pieceIndex)}
              onDragEnd={() => {
                dragPieceIndexRef.current = null;
                setPreviewOrigin(null);
              }}
              onDragStart={(event) => {
                dragPieceIndexRef.current = pieceIndex;
                selectPiece(pieceIndex);
                event.dataTransfer.effectAllowed = "move";
              }}
              type="button"
            >
              {piece ? (
                <span className="block-piece-grid">
                  {piece.cells.map(([row, col]) => (
                    <span
                      className={`block-piece-cell color-${piece.color}`}
                      key={`${row}-${col}`}
                      style={{ gridColumn: col + 1, gridRow: row + 1 }}
                    />
                  ))}
                </span>
              ) : null}
              {piece ? (
                <span className="block-piece__hint">
                  {selectedPieceIndex === pieceIndex ? "선택됨" : "선택"}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <p className="logic-board-status" role="status">{status}</p>
        {phase !== "idle" ? (
          <div className="block-blast-session-controls">
            <Button size="small" variant="secondary" onClick={startGame}>
              <RestartIcon />
              새 게임
            </Button>
          </div>
        ) : null}
      </div>

      {phase === "idle" ? (
        <GameStageOverlay state="start">
          <GameStageModal
            className="game-stage-start-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-blast-start-title"
          >
            <GameStageDoodle variant="start" />
            <h2 id="block-blast-start-title">Block Blast</h2>
            <GameGuideContent compact guide={game.guide ?? { description: game.howTo }} />
            <div className="game-stage-modal__actions"><Button autoFocus onClick={startGame}>게임 시작</Button></div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === "gameover" ? (
        <GameStageOverlay state="failure">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="block-blast-over-title">
            <GameStageDoodle variant="failure" />
            <h2 id="block-blast-over-title">더 놓을 곳이 없어요</h2>
            <p>이번 점수는 {score}점이에요.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={startGame}>다시 플레이</Button>
              <Button variant="secondary" onClick={() => navigate("/")}>게임 목록으로</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === "paused" && !isExitOpen ? (
        <GameStageOverlay state="paused">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="block-blast-paused-title">
            <h2 id="block-blast-paused-title">일시정지</h2>
            <p>보드와 점수가 그대로 멈춰 있어요.</p>
            <div className="game-stage-modal__actions">
              <Button autoFocus onClick={resumeGame}>
                <PlayIcon />
                계속하기
              </Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {isExitOpen ? (
        <GameStageOverlay state="confirm">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="block-blast-exit-title">
            <h2 id="block-blast-exit-title">게임을 나갈까요?</h2>
            <p>현재 점수와 보드는 저장되지 않아요.</p>
            <div className="game-stage-modal__actions">
              <Button onClick={() => navigate("/")}>나가기</Button>
              <Button variant="secondary" onClick={continueGame}>계속하기</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
