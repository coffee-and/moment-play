import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameAudio } from "../../../../shared/audio/GameAudioContext.jsx";
import { Button } from "../../../../shared/components/Button.jsx";
import { RANKING_GAME } from "../../../ranking/rankingConstants.js";
import { ResultSubmissionStatus } from "../../../ranking/ResultSubmissionStatus.jsx";
import { useGameResultSubmission } from "../../../ranking/useGameResultSubmission.js";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageDoodle } from "../../shared/components/GameStageDoodle.jsx";
import { GameRecordCelebration } from "../../shared/components/GameRecordCelebration.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import { PuzzleHintButton, PuzzleHintPanel } from "../../shared/components/PuzzleHintPanel.jsx";
import { getStreakCelebrationCopy, NEXT_ROUND_LABEL, useGameStreak } from "../../shared/gameStreak.js";
import { isNewGameRecord, RECORD_DIRECTION } from "../../shared/gameRecord.js";
import { usePuzzleHints } from "../../shared/hooks/usePuzzleHints.js";
import {
  DEFAULT_SUDOKU_GAME_META,
  SUDOKU_BOARD_SIZE,
  SUDOKU_CELL_COUNT,
  SUDOKU_COPY,
  SUDOKU_LEVEL,
  SUDOKU_LEVEL_OPTIONS,
  SUDOKU_LEVEL_ORDER,
  SUDOKU_NUMBERS,
  SUDOKU_PHASE,
  SUDOKU_RECORDS_KEY,
} from "./sudoku.constants.js";
import {
  getBoxIndexes,
  getCellValue,
  getColumnIndex,
  getColumnIndexes,
  getConflictIndexes,
  getRowIndex,
  getRowIndexes,
  isBoardComplete,
  isGivenCell,
} from "./sudoku.logic.js";
import { DEFAULT_SUDOKU_PUZZLE, SUDOKU_PUZZLES } from "./sudoku.puzzles.js";

const EMPTY_LEVEL_RECORD = { completedCount: 0, bestTimeSeconds: null, lastCompletedAt: null };

const PUZZLE_LEVEL_MAP = { "입문": SUDOKU_LEVEL.EASY, "중급": SUDOKU_LEVEL.MEDIUM, "도전": SUDOKU_LEVEL.ADVANCED };

const ARROW_KEY_MOVES = {
  ArrowUp: { row: -1, column: 0 },
  ArrowRight: { row: 0, column: 1 },
  ArrowDown: { row: 1, column: 0 },
  ArrowLeft: { row: 0, column: -1 },
};

function joinClassNames(values) { return values.filter(Boolean).join(" "); }
function createEmptyUserValues() { return Array.from({ length: SUDOKU_CELL_COUNT }, () => 0); }
function getInitialSelectedIndex(puzzle) { const firstEditableIndex = puzzle.findIndex((value) => value === 0); return firstEditableIndex >= 0 ? firstEditableIndex : 0; }
function getKeyboardNumber(key) { if (/^[1-9]$/.test(key)) return Number(key); if (/^Numpad[1-9]$/.test(key)) return Number(key.replace("Numpad", "")); return null; }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function createBoard(puzzle, userValues) { return puzzle.map((_, index) => getCellValue(puzzle, userValues, index)); }
function formatTime(totalSeconds) { const safeSeconds = Math.max(0, Number(totalSeconds) || 0); const minutes = Math.floor(safeSeconds / 60); const seconds = safeSeconds % 60; return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`; }
function getPuzzleLevel(puzzle) { return puzzle.level ?? PUZZLE_LEVEL_MAP[puzzle.difficulty] ?? SUDOKU_LEVEL.EASY; }
function getLevelOption(level) { return SUDOKU_LEVEL_OPTIONS.find((option) => option.id === level) ?? SUDOKU_LEVEL_OPTIONS[0]; }
function getLevelLabel(level) { return getLevelOption(level).label; }
function getNextLevel(level) { const currentIndex = SUDOKU_LEVEL_ORDER.indexOf(level); return currentIndex >= 0 ? SUDOKU_LEVEL_ORDER[currentIndex + 1] ?? null : null; }
function getPuzzlesByLevel(level) { return SUDOKU_PUZZLES.filter((puzzle) => getPuzzleLevel(puzzle) === level); }
function getFirstPuzzleByLevel(level) { return getPuzzlesByLevel(level)[0] ?? DEFAULT_SUDOKU_PUZZLE; }
function getNextPuzzleForLevel(currentPuzzle) { const level = getPuzzleLevel(currentPuzzle); const levelPuzzles = getPuzzlesByLevel(level); const currentIndex = levelPuzzles.findIndex((puzzle) => puzzle.id === currentPuzzle.id); const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % levelPuzzles.length; return levelPuzzles[nextIndex] ?? getFirstPuzzleByLevel(level); }
function formatCopy(template, replacements) { return Object.entries(replacements).reduce((copy, [key, value]) => copy.replace(`{${key}}`, value), template); }
function createEmptyLevelRecords() { return SUDOKU_LEVEL_ORDER.reduce((records, level) => { records[level] = { ...EMPTY_LEVEL_RECORD }; return records; }, {}); }
function createEmptyRecords() { return { completedCount: 0, bestTimeSeconds: null, lastCompletedAt: null, byLevel: createEmptyLevelRecords() }; }
function normalizeTime(value) { if (value === null || value === undefined) return null; const time = Number(value); return Number.isFinite(time) && time > 0 ? time : null; }
function normalizeLevelRecord(value) { if (!value || typeof value !== "object") return { ...EMPTY_LEVEL_RECORD }; const completedCount = Number(value.completedCount); return { completedCount: Number.isFinite(completedCount) && completedCount > 0 ? completedCount : 0, bestTimeSeconds: normalizeTime(value.bestTimeSeconds), lastCompletedAt: typeof value.lastCompletedAt === "string" ? value.lastCompletedAt : null }; }
function normalizeRecords(value) { if (!value || typeof value !== "object") return createEmptyRecords(); const completedCount = Number(value.completedCount); const byLevel = createEmptyLevelRecords(); SUDOKU_LEVEL_ORDER.forEach((level) => { byLevel[level] = normalizeLevelRecord(value.byLevel?.[level]); }); return { completedCount: Number.isFinite(completedCount) && completedCount > 0 ? completedCount : 0, bestTimeSeconds: normalizeTime(value.bestTimeSeconds), lastCompletedAt: typeof value.lastCompletedAt === "string" ? value.lastCompletedAt : null, byLevel }; }
export function readRecords() { if (typeof window === "undefined") return createEmptyRecords(); try { return normalizeRecords(JSON.parse(window.localStorage.getItem(SUDOKU_RECORDS_KEY))); } catch { return createEmptyRecords(); } }
function saveRecords(records) { if (typeof window === "undefined") return; try { window.localStorage.setItem(SUDOKU_RECORDS_KEY, JSON.stringify(records)); } catch { return; } }
function getCellAriaLabel({ conflictIndexes, index, puzzle, selected, value }) { const row = getRowIndex(index) + 1; const column = getColumnIndex(index) + 1; const source = isGivenCell(puzzle, index) ? "고정 숫자" : value ? "입력한 숫자" : "빈 칸"; const valueLabel = value ? `숫자 ${value}` : "값 없음"; const conflictLabel = conflictIndexes.has(index) ? ", 충돌 있음" : ""; const selectedLabel = selected ? ", 선택됨" : ""; return `${row}행 ${column}열, ${source}, ${valueLabel}${selectedLabel}${conflictLabel}`; }
function getCompletedCopy(level) { const nextLevel = getNextLevel(level); if (nextLevel) { const nextLevelLabel = getLevelLabel(nextLevel); return { title: formatCopy(SUDOKU_COPY.completed.nextLevelTitle, { level: nextLevelLabel }), description: SUDOKU_COPY.completed.nextLevelDescription, button: formatCopy(SUDOKU_COPY.completed.nextLevelButton, { level: nextLevelLabel }), nextLevel }; } return { title: SUDOKU_COPY.completed.retryAdvancedTitle, description: SUDOKU_COPY.completed.retryAdvancedDescription, button: SUDOKU_COPY.completed.retryAdvancedButton, nextLevel: SUDOKU_LEVEL.ADVANCED }; }

export function SudokuLevelGame({ game = DEFAULT_SUDOKU_GAME_META }) {
  const navigate = useNavigate();
  const { playSound } = useGameAudio();
  const rankingSubmission = useGameResultSubmission();
  const gameStreak = useGameStreak();
  const [activePuzzle, setActivePuzzle] = useState(DEFAULT_SUDOKU_PUZZLE);
  const [userValues, setUserValues] = useState(() => createEmptyUserValues());
  const [phase, setPhase] = useState(SUDOKU_PHASE.IDLE);
  const [selectedIndex, setSelectedIndex] = useState(() => getInitialSelectedIndex(DEFAULT_SUDOKU_PUZZLE.puzzle));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [records, setRecords] = useState(() => readRecords());
  const [didBreakRecordThisAttempt, setDidBreakRecordThisAttempt] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isSurrenderOpen, setIsSurrenderOpen] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  const phaseRef = useRef(phase);
  const selectedIndexRef = useRef(selectedIndex);
  const activePuzzleRef = useRef(activePuzzle);
  const elapsedSecondsRef = useRef(elapsedSeconds);
  const recordsRef = useRef(records);
  const startedAtRef = useRef(null);
  const stageContentRef = useRef(null);
  const cellRefs = useRef([]);
  const startButtonRef = useRef(null);
  const resetCancelButtonRef = useRef(null);
  const completedButtonRef = useRef(null);
  const nextRoundPendingRef = useRef(false);

  const activeLevel = getPuzzleLevel(activePuzzle);
  const activeLevelLabel = getLevelLabel(activeLevel);
  const levelRecords = records.byLevel?.[activeLevel] ?? EMPTY_LEVEL_RECORD;
  const completedCopy = getCompletedCopy(activeLevel);
  const streakCopy = getStreakCelebrationCopy(gameStreak.completionStreak);
  const board = useMemo(() => createBoard(activePuzzle.puzzle, userValues), [activePuzzle.puzzle, userValues]);
  const hintTargetIndex = board.findIndex((value, index) => (
    !isGivenCell(activePuzzle.puzzle, index) && value !== activePuzzle.solution[index]
  ));
  const safeHintTargetIndex = hintTargetIndex >= 0 ? hintTargetIndex : getInitialSelectedIndex(activePuzzle.puzzle);
  const hintTargetRow = getRowIndex(safeHintTargetIndex) + 1;
  const hintTargetColumn = getColumnIndex(safeHintTargetIndex) + 1;
  const hint = usePuzzleHints([
    {
      message: `${hintTargetRow}행을 살펴보세요. 아직 들어가지 않은 숫자를 먼저 찾아보세요.`,
      targetIndexes: getRowIndexes(safeHintTargetIndex),
    },
    {
      message: `${hintTargetColumn}열과 같은 3×3 구역을 함께 비교하면 후보를 하나로 줄일 수 있어요.`,
      targetIndexes: [...new Set([
        ...getColumnIndexes(safeHintTargetIndex),
        ...getBoxIndexes(safeHintTargetIndex),
      ])],
    },
    {
      message: `${hintTargetRow}행 ${hintTargetColumn}열에는 ${activePuzzle.solution[safeHintTargetIndex]}가 들어가요.`,
      targetIndexes: [safeHintTargetIndex],
    },
  ]);
  const conflictIndexes = useMemo(() => new Set(getConflictIndexes(board)), [board]);
  const selectedValue = selectedIndex === null ? 0 : board[selectedIndex];
  const selectedHighlights = useMemo(() => {
    if (selectedIndex === null) return { row: new Set(), column: new Set(), box: new Set() };
    return { row: new Set(getRowIndexes(selectedIndex)), column: new Set(getColumnIndexes(selectedIndex)), box: new Set(getBoxIndexes(selectedIndex)) };
  }, [selectedIndex]);
  const canEditSelected = phase === SUDOKU_PHASE.PLAYING && selectedIndex !== null && !isGivenCell(activePuzzle.puzzle, selectedIndex) && !isAnswerRevealed;
  const isStageCovered = phase === SUDOKU_PHASE.IDLE || phase === SUDOKU_PHASE.COMPLETED || phase === SUDOKU_PHASE.RESET_CONFIRM || isExitConfirmOpen || isSurrenderOpen;
  const statusText = isAnswerRevealed ? "정답을 표시한 연습 판이에요." : SUDOKU_COPY.status[phase] ?? SUDOKU_COPY.status.idle;
  const bestTimeText = levelRecords.bestTimeSeconds === null ? SUDOKU_COPY.meta.emptyBestTime : formatTime(levelRecords.bestTimeSeconds);
  const gameActions = <div className="game-stage__inline-actions">{phase === SUDOKU_PHASE.IDLE ? null : <Button type="button" variant="secondary" onClick={requestNewGame}>{SUDOKU_COPY.actions.newGame}</Button>}<Button type="button" variant="secondary" onClick={requestExit}>게임 나가기</Button></div>;
  const sidebar = (
    <>
      <div className="stat-row">
        <div className="stat"><div className="l">Level</div><div className="v"><small>{activeLevelLabel}</small></div></div>
        <div className="stat"><div className="l">Time</div><div className="v">{formatTime(elapsedSeconds)}</div></div>
        <div className="stat"><div className="l">Clear</div><div className="v">{levelRecords.completedCount}</div></div>
        <div className="stat"><div className="l">Best</div><div className="v">{bestTimeText}</div></div>
      </div>
      <p className="game-stage__side-note">{activeLevelLabel} · {statusText}</p>
    </>
  );

  phaseRef.current = phase;
  selectedIndexRef.current = selectedIndex;
  activePuzzleRef.current = activePuzzle;
  elapsedSecondsRef.current = elapsedSeconds;
  recordsRef.current = records;

  useEffect(() => { if (!stageContentRef.current) return; stageContentRef.current.inert = isStageCovered; }, [isStageCovered]);
  useEffect(() => { if (phase === SUDOKU_PHASE.PLAYING) nextRoundPendingRef.current = false; }, [phase]);
  useEffect(() => { if (phase === SUDOKU_PHASE.IDLE) startButtonRef.current?.focus({ preventScroll: true }); if (phase === SUDOKU_PHASE.RESET_CONFIRM) resetCancelButtonRef.current?.focus({ preventScroll: true }); if (phase === SUDOKU_PHASE.COMPLETED) completedButtonRef.current?.focus({ preventScroll: true }); }, [phase]);
  useEffect(() => {
    if (isExitConfirmOpen || isSurrenderOpen || isAnswerRevealed || (phase !== SUDOKU_PHASE.PLAYING && phase !== SUDOKU_PHASE.RESET_CONFIRM)) return undefined;
    function updateElapsedSeconds() { setElapsedSeconds(getCurrentElapsedSeconds()); }
    updateElapsedSeconds();
    const intervalId = window.setInterval(updateElapsedSeconds, 1000);
    return () => window.clearInterval(intervalId);
  }, [isAnswerRevealed, isExitConfirmOpen, isSurrenderOpen, phase]);

  function focusCell(index) { window.requestAnimationFrame(() => { cellRefs.current[index]?.focus({ preventScroll: true }); }); }
  function getCurrentElapsedSeconds() { if (!startedAtRef.current) return elapsedSecondsRef.current; return Math.max(0, Math.floor((performance.now() - startedAtRef.current) / 1000)); }
  function startPuzzle(puzzle, { preserveStreak = false } = {}) { playSound("countdownFinal"); const nextSelectedIndex = getInitialSelectedIndex(puzzle.puzzle); rankingSubmission.startAttempt(); hint.resetHints(); gameStreak.beginRound({ preserveStreak }); startedAtRef.current = performance.now(); setActivePuzzle(puzzle); setUserValues(createEmptyUserValues()); setElapsedSeconds(0); setSelectedIndex(nextSelectedIndex); setDidBreakRecordThisAttempt(false); setIsAnswerRevealed(false); setIsSurrenderOpen(false); setPhase(SUDOKU_PHASE.PLAYING); phaseRef.current = SUDOKU_PHASE.PLAYING; focusCell(nextSelectedIndex); }
  function startLevel(level, options) { startPuzzle(getFirstPuzzleByLevel(level), options); }
  function requestNewGame() { if (phaseRef.current === SUDOKU_PHASE.IDLE) { startLevel(activeLevel); return; } if (phaseRef.current === SUDOKU_PHASE.COMPLETED) { startPuzzle(getNextPuzzleForLevel(activePuzzleRef.current)); return; } if (phaseRef.current !== SUDOKU_PHASE.RESET_CONFIRM) setPhase(SUDOKU_PHASE.RESET_CONFIRM); }
  function closeResetConfirm() { setPhase(SUDOKU_PHASE.PLAYING); focusCell(selectedIndexRef.current); }
  function confirmNewGame() { startPuzzle(getNextPuzzleForLevel(activePuzzleRef.current)); }
  function returnToLevelSelect() { const puzzle = activePuzzleRef.current; gameStreak.disqualifyRound(); startedAtRef.current = null; setUserValues(createEmptyUserValues()); setElapsedSeconds(0); setSelectedIndex(getInitialSelectedIndex(puzzle.puzzle)); setPhase(SUDOKU_PHASE.IDLE); }
  function requestExit() { if (phaseRef.current === SUDOKU_PHASE.IDLE || phaseRef.current === SUDOKU_PHASE.COMPLETED) { navigate("/"); return; } const currentElapsed = getCurrentElapsedSeconds(); elapsedSecondsRef.current = currentElapsed; setElapsedSeconds(currentElapsed); startedAtRef.current = null; setIsExitConfirmOpen(true); }
  function cancelExit() { startedAtRef.current = performance.now() - elapsedSecondsRef.current * 1000; setIsExitConfirmOpen(false); focusCell(selectedIndexRef.current); }
  function confirmExit() { gameStreak.disqualifyRound(); startedAtRef.current = null; navigate("/"); }
  function requestSurrender() { const currentElapsed = getCurrentElapsedSeconds(); elapsedSecondsRef.current = currentElapsed; setElapsedSeconds(currentElapsed); startedAtRef.current = null; setIsSurrenderOpen(true); }
  function cancelSurrender() { startedAtRef.current = performance.now() - elapsedSecondsRef.current * 1000; setIsSurrenderOpen(false); focusCell(selectedIndexRef.current); }
  function revealSolution() { gameStreak.disqualifyRound({ answerRevealed: true }); setUserValues([...activePuzzleRef.current.solution]); setIsSurrenderOpen(false); setIsAnswerRevealed(true); }
  function continueAfterAnswer() { if (nextRoundPendingRef.current) return; nextRoundPendingRef.current = true; startPuzzle(getNextPuzzleForLevel(activePuzzleRef.current)); }
  function continueAfterComplete() { if (nextRoundPendingRef.current) return; nextRoundPendingRef.current = true; startLevel(completedCopy.nextLevel, { preserveStreak: true }); }
  function completeGame() { if (phaseRef.current !== SUDOKU_PHASE.PLAYING || isAnswerRevealed) return; phaseRef.current = SUDOKU_PHASE.COMPLETED; gameStreak.recordSuccess(); playSound("clear"); const finalTimeSeconds = getCurrentElapsedSeconds(); const currentRecords = recordsRef.current; const level = getPuzzleLevel(activePuzzleRef.current); const currentLevelRecord = currentRecords.byLevel?.[level] ?? EMPTY_LEVEL_RECORD; const didBreakRecord = isNewGameRecord({ previous: currentLevelRecord.bestTimeSeconds, next: finalTimeSeconds, direction: RECORD_DIRECTION.LOWER }); const nextLevelRecord = { completedCount: currentLevelRecord.completedCount + 1, bestTimeSeconds: didBreakRecord ? finalTimeSeconds : currentLevelRecord.bestTimeSeconds, lastCompletedAt: new Date().toISOString() }; const nextRecords = { completedCount: currentRecords.completedCount + 1, bestTimeSeconds: isNewGameRecord({ previous: currentRecords.bestTimeSeconds, next: finalTimeSeconds, direction: RECORD_DIRECTION.LOWER }) ? finalTimeSeconds : currentRecords.bestTimeSeconds, lastCompletedAt: nextLevelRecord.lastCompletedAt, byLevel: { ...createEmptyLevelRecords(), ...currentRecords.byLevel, [level]: nextLevelRecord } }; startedAtRef.current = null; setElapsedSeconds(finalTimeSeconds); setDidBreakRecordThisAttempt(didBreakRecord); setRecords(nextRecords); saveRecords(nextRecords); setPhase(SUDOKU_PHASE.COMPLETED); if (!hint.hasUsedHint) void rankingSubmission.submitResult({ gameKey: RANKING_GAME.SUDOKU, mode: level, durationMs: Math.max(1000, finalTimeSeconds * 1000) }); }
  function updateSelectedValue(value) {
    if (!canEditSelected) return;
    const index = selectedIndexRef.current;
    const nextUserValues = [...userValues];
    nextUserValues[index] = value;
    const nextBoard = createBoard(activePuzzle.puzzle, nextUserValues);
    const isComplete = isBoardComplete(nextBoard, activePuzzle.solution);
    setUserValues(nextUserValues);
    if (isComplete) {
      completeGame();
      return;
    }
    if (value === 0) {
      playSound("move");
      return;
    }
    playSound(nextBoard[index] === activePuzzle.solution[index] ? "correct" : "wrong");
  }
  function eraseSelectedValue() { updateSelectedValue(0); }
  function selectCell(index) { setSelectedIndex(index); }
  function moveSelectedCell(key) { const move = ARROW_KEY_MOVES[key]; if (!move || selectedIndexRef.current === null) return; const row = getRowIndex(selectedIndexRef.current); const column = getColumnIndex(selectedIndexRef.current); const nextRow = clamp(row + move.row, 0, SUDOKU_BOARD_SIZE - 1); const nextColumn = clamp(column + move.column, 0, SUDOKU_BOARD_SIZE - 1); const nextIndex = nextRow * SUDOKU_BOARD_SIZE + nextColumn; setSelectedIndex(nextIndex); focusCell(nextIndex); }
  function handleGameKeyDown(event) { if (phaseRef.current !== SUDOKU_PHASE.PLAYING) return; const number = getKeyboardNumber(event.key); if (number) { event.preventDefault(); updateSelectedValue(number); return; } if (event.key === "Backspace" || event.key === "Delete") { event.preventDefault(); eraseSelectedValue(); return; } if (ARROW_KEY_MOVES[event.key]) { event.preventDefault(); moveSelectedCell(event.key); } }
  function getCellClassName(index, value) { const selected = selectedIndex === index; const given = isGivenCell(activePuzzle.puzzle, index); const sameNumber = Boolean(selectedValue && value === selectedValue && !selected); const related = !selected && (selectedHighlights.row.has(index) || selectedHighlights.column.has(index) || selectedHighlights.box.has(index)); return joinClassNames(["sudoku-game__cell", selected ? "is-selected" : "", related ? "is-related" : "", sameNumber ? "is-same-number" : "", conflictIndexes.has(index) ? "is-conflict" : "", given ? "is-given" : "", !given && value ? "is-user" : "", value ? "" : "is-empty", hint.currentStep?.targetIndexes?.includes(index) ? "is-hint-target" : ""]); }

  return (
    <GameStage className="sudoku-game" eyebrow={game.eyebrow} title={game.title} description={game.description} actions={gameActions} isExitConfirmationOpen={isExitConfirmOpen} onRequestExit={requestExit} sidebar={sidebar} ariaLabel={game.title}>
      <div ref={stageContentRef} className="sudoku-game__stage" aria-hidden={isStageCovered ? "true" : undefined} onKeyDown={handleGameKeyDown}>
        {phase !== SUDOKU_PHASE.IDLE ? (
          <div className="sudoku-game__play">
            <section className="sudoku-game__meta" aria-label={`${activeLevelLabel} 스도쿠 기록`}>
              <div><span>{SUDOKU_COPY.meta.completed}</span><strong>{levelRecords.completedCount}</strong></div>
              <div><span>{SUDOKU_COPY.meta.bestTime}</span><strong>{bestTimeText}</strong></div>
              <div><span>{SUDOKU_COPY.meta.currentTime}</span><strong>{formatTime(elapsedSeconds)}</strong></div>
            </section>
            <p className="sudoku-game__status" aria-live="polite">{activeLevelLabel} · {statusText}</p>
            <div className="sudoku-game__board" role="grid" aria-label={`${activeLevelLabel} 스도쿠 보드`} aria-rowcount={SUDOKU_BOARD_SIZE} aria-colcount={SUDOKU_BOARD_SIZE}>
              {board.map((value, index) => {
                const selected = selectedIndex === index;
                return (
                  <button ref={(element) => { cellRefs.current[index] = element; }} type="button" className={getCellClassName(index, value)} key={`${activePuzzle.id}-${index}`} role="gridcell" aria-label={getCellAriaLabel({ conflictIndexes, index, puzzle: activePuzzle.puzzle, selected, value })} aria-selected={selected} aria-readonly={isGivenCell(activePuzzle.puzzle, index) ? "true" : undefined} aria-rowindex={getRowIndex(index) + 1} aria-colindex={getColumnIndex(index) + 1} onClick={() => selectCell(index)}>
                    {value ? <span>{value}</span> : null}
                  </button>
                );
              })}
            </div>
            <div className="sudoku-game__controls" role="group" aria-label={SUDOKU_COPY.numberPadLabel}>
              {SUDOKU_NUMBERS.map((number) => (
                <button type="button" className="sudoku-game__number-button" key={number} onClick={() => updateSelectedValue(number)} disabled={!canEditSelected} aria-label={`${number} 입력`}>{number}</button>
              ))}
              <button type="button" className="sudoku-game__erase-button" onClick={eraseSelectedValue} disabled={!canEditSelected} aria-label={SUDOKU_COPY.eraseLabel}>Del</button>
            </div>
            {!isAnswerRevealed ? (
              <div className="sudoku-game__assist">
                <PuzzleHintButton hint={hint} />
                <Button size="small" type="button" variant="secondary" onClick={requestSurrender}>포기</Button>
              </div>
            ) : (
              <section className="logic-puzzle-stage__answer-summary" aria-labelledby="sudoku-answer-title">
                <strong id="sudoku-answer-title">정답을 확인했어요</strong>
                <p>표시된 풀이를 천천히 살펴보세요.</p>
                <span>연속 성공 기록은 초기화됐어요.</span>
                <Button type="button" onClick={continueAfterAnswer}>{NEXT_ROUND_LABEL}</Button>
              </section>
            )}
            {!isAnswerRevealed ? <PuzzleHintPanel gameId={game.id} hint={hint} /> : null}
          </div>
        ) : null}
      </div>
      {isStageCovered ? (
        <GameStageOverlay className="sudoku-game__overlay-layer" state={isExitConfirmOpen ? "exit-confirm" : phase === SUDOKU_PHASE.IDLE ? "start" : phase}>
          {phase === SUDOKU_PHASE.IDLE && !isExitConfirmOpen ? (
            <GameStageModal className="sudoku-game__modal sudoku-game__start" role="dialog" aria-modal="true" aria-labelledby="sudoku-game-start-title">
              <GameStageDoodle variant="start" />
              <p className="sudoku-game__modal-eyebrow">{SUDOKU_COPY.start.eyebrow}</p>
              <h3 id="sudoku-game-start-title">{SUDOKU_COPY.start.title}</h3>
              <p>{SUDOKU_COPY.start.description}</p>
              <div className="sudoku-game__level-list" role="group" aria-label="스도쿠 난이도 선택">
                {SUDOKU_LEVEL_OPTIONS.map((option, index) => (
                  <button ref={index === 0 ? startButtonRef : null} type="button" className="sudoku-game__level-button" key={option.id} onClick={() => startLevel(option.id)} aria-label={`${option.label} 난이도 시작`}>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </GameStageModal>
          ) : null}
          {isExitConfirmOpen ? (
            <GameStageModal className="sudoku-game__modal" role="dialog" aria-modal="true" aria-labelledby="sudoku-game-exit-title">
              <h3 id="sudoku-game-exit-title">게임을 나갈까요?</h3>
              <p>현재 퍼즐 진행은 저장되지 않아요.</p>
              <div className="game-stage-modal__actions"><Button type="button" onClick={cancelExit}>계속하기</Button><Button type="button" variant="secondary" onClick={confirmExit}>게임 나가기</Button></div>
            </GameStageModal>
          ) : null}
          {phase === SUDOKU_PHASE.COMPLETED && !isExitConfirmOpen ? (
            <GameStageModal
              celebrationStreak={gameStreak.completionStreak}
              className="sudoku-game__modal sudoku-game__modal--complete"
              showCompletionStars
              role="dialog"
              aria-modal="true"
              aria-labelledby="sudoku-game-complete-title"
            >
              <GameRecordCelebration isNewRecord={didBreakRecordThisAttempt} />
              <p className="sudoku-game__modal-eyebrow">{SUDOKU_COPY.completed.eyebrow}</p>
              <h3 id="sudoku-game-complete-title">{streakCopy.title}</h3>
              <p>{streakCopy.subtitle}</p>
              <p>{completedCopy.title} {completedCopy.description}</p>
              <strong>{formatTime(elapsedSeconds)}</strong>
              <p>{SUDOKU_COPY.completed.bestTime}</p>
              {hint.hasUsedHint
                ? <p className="puzzle-hint-result-label">힌트 사용 · 연습 기록 · 랭킹 미제출</p>
                : <ResultSubmissionStatus submission={rankingSubmission} />}
              <div className="game-stage-modal__actions">
                <Button ref={completedButtonRef} type="button" onClick={continueAfterComplete}>{NEXT_ROUND_LABEL}</Button>
                <Button type="button" variant="secondary" onClick={returnToLevelSelect}>{SUDOKU_COPY.actions.chooseLevel}</Button>
              </div>
            </GameStageModal>
          ) : null}
          {phase === SUDOKU_PHASE.RESET_CONFIRM && !isExitConfirmOpen ? (
            <GameStageModal className="sudoku-game__modal" role="dialog" aria-modal="true" aria-labelledby="sudoku-game-reset-title">
              <h3 id="sudoku-game-reset-title">{SUDOKU_COPY.reset.title}</h3>
              <p>{SUDOKU_COPY.reset.description}</p>
              <div className="game-stage-modal__actions">
                <Button ref={resetCancelButtonRef} type="button" variant="secondary" onClick={closeResetConfirm}>{SUDOKU_COPY.actions.keepPlaying}</Button>
                <Button type="button" onClick={confirmNewGame}>{SUDOKU_COPY.reset.confirm}</Button>
              </div>
            </GameStageModal>
          ) : null}
          {isSurrenderOpen ? (
            <GameStageModal className="sudoku-game__modal" role="dialog" aria-modal="true" aria-labelledby="sudoku-game-surrender-title">
              <h3 id="sudoku-game-surrender-title">정말 포기할까요?</h3>
              <p>정답을 확인하면 이번 판은 완료 기록과 랭킹에 포함되지 않아요.</p>
              <div className="game-stage-modal__actions">
                <Button type="button" onClick={revealSolution}>정답 보기</Button>
                <Button type="button" variant="secondary" onClick={cancelSurrender}>계속 풀기</Button>
              </div>
            </GameStageModal>
          ) : null}
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
