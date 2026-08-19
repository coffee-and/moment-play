import { Button } from "../../../../shared/components/Button.jsx";
import { CloseIcon, PauseIcon, PlayIcon, RestartIcon, TrophyIcon } from "../../../../shared/components/icons/PhosphorIcons.jsx";
import { GameActionFeedback } from "../../shared/components/GameActionFeedback.jsx";
import { GameGuideContent } from "../../guide/GameGuide.jsx";
import { GameIconButton } from "../../shared/components/GameIconButton.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import { PuzzleHintButton, PuzzleHintPanel } from "../../shared/components/PuzzleHintPanel.jsx";
import { BLOCK_BLAST_SIZE, canPlaceBlockPiece } from "./blockBlast.logic.js";
import feedbackStyles from "./block-blast-feedback.module.css";
import { bindCssModule } from "../../../../shared/styles/bindCssModule.js";
import styles from "./block-blast.module.css";
import { useBlockBlastGame } from "./useBlockBlastGame.js";

const cx = bindCssModule(styles);

export function BlockBlastGame({ game }) {
  const {
    score,
    bestScore,
    combo,
    phase,
    pauseGame,
    isExitOpen,
    resumeGame,
    requestExit,
    setPreviewOrigin,
    board,
    selectedPiece,
    previewIndexes,
    previewIsValid,
    hint,
    placeSelected,
    dragPieceIndexRef,
    actionFeedback,
    pieces,
    selectedPieceIndex,
    selectPiece,
    status,
    startGame,
    navigateFromGame,
    continueGame,
  } = useBlockBlastGame();
  const sidebar = (
    <div className={cx("stat-row")}>
      <div className={cx("stat")}><div className={cx("l")}>Score</div><div className={cx("v")}>{score}</div></div>
      <div className={cx("stat")}><div className={cx("l")}>Best</div><div className={cx("v")}>{bestScore}</div></div>
      <div className={cx("stat")}><div className={cx("l")}>Combo</div><div className={cx("v")}>×{combo}</div></div>
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
      className={cx("block-blast-game")}
      eyebrow="BLOCK / SCORE"
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
      <div className={cx("block-blast-layout")}>
        <div className={cx(`block-blast-board-wrap ${feedbackStyles.host}`)}>
          <div
            className={cx("block-blast-board")}
            role="grid"
            tabIndex={-1}
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
                  className={cx(`block-blast-cell${value ? ` is-filled color-${value}` : ""}${
                    isValidOrigin ? " is-valid-origin" : ""
                  }${isPreview ? previewIsValid ? ` is-preview color-${selectedPiece.color}` : " is-invalid-preview" : ""}${
                    hint.currentStep?.targetIndexes?.includes(index) ? " is-hint-target" : ""
                  }`)}
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
          <GameActionFeedback className={feedbackStyles.feedback} feedback={actionFeedback} />
        </div>

        <div className={cx("block-blast-tray")} aria-label="사용할 블록">
          {pieces.map((piece, pieceIndex) => (
            <button
              aria-label={piece ? `${piece.cells.length}칸 블록 선택` : "사용한 블록"}
              aria-pressed={selectedPieceIndex === pieceIndex}
              className={cx(`block-piece${selectedPieceIndex === pieceIndex ? " is-selected" : ""}${hint.currentStep?.targetPieceIndex === pieceIndex ? " is-hint-target" : ""}`)}
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
                <span className={cx("block-piece-grid")}>
                  {piece.cells.map(([row, col]) => (
                    <span
                      className={cx(`block-piece-cell color-${piece.color}`)}
                      key={`${row}-${col}`}
                      style={{ gridColumn: col + 1, gridRow: row + 1 }}
                    />
                  ))}
                </span>
              ) : null}
              {piece ? (
                <span className={cx("block-piece__hint")}>
                  {selectedPieceIndex === pieceIndex ? "선택됨" : "선택"}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <p className={cx("logic-board-status")} role="status">{status}</p>
        {phase !== "idle" ? (
          <div className={cx("block-blast-session-controls")}>
            {phase === "playing" ? <PuzzleHintButton hint={hint} /> : null}
            <Button size="small" variant="secondary" onClick={startGame}>
              <RestartIcon />
              새 게임
            </Button>
          </div>
        ) : null}
        {phase === "playing" ? <PuzzleHintPanel gameId={game.id} hint={hint} /> : null}
      </div>

      {phase === "idle" ? (
        <GameStageOverlay state="start">
          <GameStageModal
            className={cx("game-stage-start-modal")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-blast-start-title"
          >
            <GameStageDoodle variant="start" />
            <h2 id="block-blast-start-title">Block Blast</h2>
            <GameGuideContent compact guide={game.guide ?? { description: game.howTo }} />
            <div className={cx("game-stage-modal__actions")}><Button data-modal-initial-focus="" onClick={startGame}>게임 시작</Button></div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === "gameover" ? (
        <GameStageOverlay state="failure">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="block-blast-over-title">
            <GameStageDoodle variant="failure" />
            <h2 id="block-blast-over-title">더 놓을 곳이 없어요</h2>
            <p>이번 점수는 {score}점이에요.</p>
            {hint.hasUsedHint ? <p className={cx("puzzle-hint-result-label")}>힌트 사용 · 연습 기록</p> : null}
            <div className={cx("game-stage-modal__actions")}>
              <Button onClick={startGame}>다시 도전</Button>
              <Button variant="secondary" onClick={() => navigateFromGame("/")}>게임 목록으로</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}

      {phase === "paused" && !isExitOpen ? (
        <GameStageOverlay state="paused">
          <GameStageModal role="dialog" aria-modal="true" aria-labelledby="block-blast-paused-title">
            <h2 id="block-blast-paused-title">일시정지</h2>
            <p>보드와 점수가 그대로 멈춰 있어요.</p>
            <div className={cx("game-stage-modal__actions")}>
              <Button data-modal-initial-focus="" onClick={resumeGame}>
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
            <div className={cx("game-stage-modal__actions")}>
              <Button onClick={() => navigateFromGame("/")}>나가기</Button>
              <Button variant="secondary" onClick={continueGame}>계속하기</Button>
            </div>
          </GameStageModal>
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
