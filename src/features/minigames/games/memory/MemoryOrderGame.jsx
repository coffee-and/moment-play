import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../../shared/components/Button.jsx";
import { RANKING_GAME } from "../../../ranking/rankingConstants.js";
import { ResultSubmissionStatus } from "../../../ranking/ResultSubmissionStatus.jsx";
import { useGameResultSubmission } from "../../../ranking/useGameResultSubmission.js";
import { GameItemPanel } from "../../shared/components/GameItemPanel.jsx";
import { GameStage } from "../../shared/components/GameStage.jsx";
import { GameStageModal, GameStageOverlay } from "../../shared/components/GameStageOverlay.jsx";
import { createMemoryRound, evaluateMemoryChoice, shouldUpdateMemoryBest } from "./memoryOrder.logic.js";
import "./memory-game.css";

export const MEMORY_BEST_ROUND_KEY = "eunContents.memoryOrderGame.bestRound";
const KEY = MEMORY_BEST_ROUND_KEY;
const COUNTDOWN_LABELS = ["3", "2", "1", "START!"];
const COUNTDOWN_STEP_MS = 1000;
const TURN_READY_MS = 700;
const ROUND_TRANSITION_MS = 900;
const CORRECT_FEEDBACK_MS = 520;

const PHASE = {
  IDLE: "idle",
  COUNTDOWN: "countdown",
  PREVIEW: "preview",
  TURN_READY: "turn-ready",
  PLAYING: "playing",
  PAUSED: "paused",
  CLEARED: "cleared",
  FAILED: "failed",
};

export const MEMORY_TIMER_PHASE = PHASE;

const FAILURE_REASON = {
  WRONG: "wrong",
  TIMEOUT: "timeout",
};

const DEFAULT_GAME_META = {
  eyebrow: "MEMORY / ORDER",
  title: "순서 맞추기",
  description: "제한 시간 동안 순서를 기억하고 그대로 선택하세요.",
};

export const MEMORY_SYMBOLS = [
  { id: "tulip", symbol: "🌷", name: "튤립" },
  { id: "sunflower", symbol: "🌻", name: "해바라기" },
  { id: "clover", symbol: "🍀", name: "네잎클로버" },
  { id: "cherry", symbol: "🍒", name: "체리" },
  { id: "cloud", symbol: "☁️", name: "구름" },
  { id: "moon", symbol: "🌙", name: "초승달" },
  { id: "star", symbol: "⭐", name: "별" },
  { id: "heart", symbol: "❤️", name: "하트" },
];

function getBest() {
  try {
    const value = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveBest(round) {
  try {
    window.localStorage.setItem(KEY, String(round));
  } catch {
    // noop
  }
}

function formatTimer(milliseconds) {
  return Math.max(0, milliseconds / 1000).toFixed(2);
}

export function isMemoryTimerUrgent(phase, remainingMs) {
  return (phase === PHASE.PREVIEW || phase === PHASE.PLAYING) && remainingMs > 0 && remainingMs <= 3000;
}

function focusElement(element) {
  if (!element?.focus) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

function MemorySymbol({ value }) {
  return <span className="memory-symbol" aria-hidden="true">{value}</span>;
}

function MemoryPedestal() {
  return (
    <span className="memory-sequence__platform memory-pedestal" aria-hidden="true">
      <span className="memory-pedestal__shadow" />
      <span className="memory-pedestal__body" />
      <span className="memory-pedestal__top" />
    </span>
  );
}

function StopwatchIcon() {
  return (
    <svg aria-hidden="true" className="memory-game__clock-icon" fill="none" viewBox="0 0 24 24">
      <path d="M12 8v5l3 2M9 3h6M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CorrectBurst() {
  return (
    <span className="memory-card__success" aria-hidden="true">
      <span className="memory-card__success-ring" />
      {Array.from({ length: 8 }, (_, index) => (
        <span className="memory-card__success-particle" key={index} style={{ "--memory-particle-index": index }} />
      ))}
      <span className="memory-card__success-label">GOOD!</span>
    </span>
  );
}

export function MemoryOrderGame({ game = DEFAULT_GAME_META }) {
  const navigate = useNavigate();
  const rankingSubmission = useGameResultSubmission();
  const initialData = useMemo(() => createMemoryRound(1, MEMORY_SYMBOLS), []);
  const [round, setRound] = useState(1);
  const [data, setData] = useState(initialData);
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [step, setStep] = useState(0);
  const [best, setBest] = useState(() => getBest());
  const [remainingMs, setRemainingMs] = useState(initialData.selectionSeconds * 1000);
  const [countdownIndex, setCountdownIndex] = useState(0);
  const [failureReason, setFailureReason] = useState(null);
  const [didBreakRecordThisAttempt, setDidBreakRecordThisAttempt] = useState(false);
  const [correctFeedback, setCorrectFeedback] = useState(null);
  const [correctAnnouncement, setCorrectAnnouncement] = useState("");
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  const activeTimerRef = useRef(null);
  const roundTransitionTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const feedbackSequenceRef = useRef(0);
  const previousPhaseRef = useRef(null);
  const resolvingRef = useRef(false);
  const phaseRef = useRef(phase);
  const roundRef = useRef(round);
  const dataRef = useRef(data);
  const stepRef = useRef(step);
  const bestRef = useRef(best);
  const countdownIndexRef = useRef(countdownIndex);
  const stageContentRef = useRef(null);
  const pauseButtonRef = useRef(null);
  const resumeButtonRef = useRef(null);
  const retryButtonRef = useRef(null);

  const canPause = phase === PHASE.COUNTDOWN || phase === PHASE.PREVIEW || phase === PHASE.PLAYING;
  const isStageCovered =
    phase === PHASE.COUNTDOWN ||
    phase === PHASE.TURN_READY ||
    phase === PHASE.CLEARED ||
    phase === PHASE.PAUSED ||
    phase === PHASE.FAILED ||
    isExitConfirmOpen;
  const shouldShowTimer = phase === PHASE.PREVIEW || phase === PHASE.PLAYING;
  const timerText = formatTimer(remainingMs);
  const isTimerUrgent = isMemoryTimerUrgent(phase, remainingMs);
  const sequenceDensity = data.count <= 4 ? "comfortable" : data.count <= 7 ? "compact" : "dense";

  phaseRef.current = phase;
  roundRef.current = round;
  dataRef.current = data;
  stepRef.current = step;
  bestRef.current = best;
  countdownIndexRef.current = countdownIndex;

  useEffect(() => {
    if (!stageContentRef.current) return;
    stageContentRef.current.inert = isStageCovered;
  }, [isStageCovered]);

  useEffect(() => {
    if (phase === PHASE.PAUSED) focusElement(resumeButtonRef.current);
    if (phase === PHASE.FAILED) focusElement(retryButtonRef.current);
  }, [phase]);

  useEffect(() => () => clearGameTimers({ updateFeedback: false }), []);

  function clearActiveTimer({ preserve = false } = {}) {
    const timer = activeTimerRef.current;
    if (!timer) return;
    window.clearTimeout(timer.timeoutId);
    window.clearInterval(timer.intervalId);
    if (preserve) {
      activeTimerRef.current = {
        ...timer,
        intervalId: null,
        timeoutId: null,
        remainingMs: Math.max(0, timer.deadline - performance.now()),
      };
      return;
    }
    activeTimerRef.current = null;
  }

  function clearRoundTransitionTimer() {
    if (!roundTransitionTimerRef.current) return;
    window.clearTimeout(roundTransitionTimerRef.current);
    roundTransitionTimerRef.current = null;
  }

  function clearCorrectFeedback({ updateState = true } = {}) {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    if (updateState) {
      setCorrectFeedback(null);
      setCorrectAnnouncement("");
    }
  }

  function clearGameTimers({ updateFeedback = true } = {}) {
    clearActiveTimer();
    clearRoundTransitionTimer();
    clearCorrectFeedback({ updateState: updateFeedback });
  }

  function runTimer(kind, durationMs) {
    clearActiveTimer();
    const safeDuration = Math.max(0, durationMs);
    const deadline = performance.now() + safeDuration;
    const updateRemaining = () => {
      const next = Math.max(0, deadline - performance.now());
      if (kind === "preview" || kind === "selection") setRemainingMs(next);
    };
    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 50);
    const timeoutId = window.setTimeout(() => {
      clearActiveTimer();
      handleTimerComplete(kind);
    }, safeDuration);
    activeTimerRef.current = {
      kind,
      deadline,
      durationMs: safeDuration,
      remainingMs: safeDuration,
      intervalId,
      timeoutId,
    };
  }

  function resumeActiveTimer() {
    const timer = activeTimerRef.current;
    if (!timer) return;
    runTimer(timer.kind, timer.remainingMs);
  }

  function handleTimerComplete(kind) {
    if (phaseRef.current === PHASE.PAUSED) return;
    if (kind === "countdown") {
      const nextIndex = countdownIndexRef.current + 1;
      if (nextIndex < COUNTDOWN_LABELS.length) {
        startCountdown(nextIndex, COUNTDOWN_STEP_MS);
        return;
      }
      startPreview();
      return;
    }
    if (kind === "preview") {
      startTurnReady();
      return;
    }
    if (kind === "turn-ready") {
      startSelection();
      return;
    }
    if (kind === "selection") {
      failRound(FAILURE_REASON.TIMEOUT);
    }
  }

  function startCountdown(index = 0, durationMs = COUNTDOWN_STEP_MS) {
    setPhase(PHASE.COUNTDOWN);
    phaseRef.current = PHASE.COUNTDOWN;
    setCountdownIndex(index);
    countdownIndexRef.current = index;
    runTimer("countdown", durationMs);
  }

  function startPreview() {
    const nextDuration = dataRef.current.previewSeconds * 1000;
    setPhase(PHASE.PREVIEW);
    phaseRef.current = PHASE.PREVIEW;
    setRemainingMs(nextDuration);
    runTimer("preview", nextDuration);
  }

  function startTurnReady() {
    setPhase(PHASE.TURN_READY);
    phaseRef.current = PHASE.TURN_READY;
    setRemainingMs(dataRef.current.selectionSeconds * 1000);
    runTimer("turn-ready", TURN_READY_MS);
  }

  function startSelection() {
    const selectionDuration = dataRef.current.selectionSeconds * 1000;
    resolvingRef.current = false;
    setPhase(PHASE.PLAYING);
    phaseRef.current = PHASE.PLAYING;
    setRemainingMs(selectionDuration);
    runTimer("selection", selectionDuration);
  }

  function updateBestCompletedRound(completedRound) {
    if (!shouldUpdateMemoryBest(bestRef.current, completedRound)) return;
    saveBest(completedRound);
    bestRef.current = completedRound;
    setBest(completedRound);
    setDidBreakRecordThisAttempt(true);
  }

  function startRound(nextRound, { resetRecord = true } = {}) {
    clearGameTimers();
    resolvingRef.current = false;
    const nextData = createMemoryRound(nextRound, MEMORY_SYMBOLS);
    setRound(nextRound);
    roundRef.current = nextRound;
    setData(nextData);
    dataRef.current = nextData;
    setStep(0);
    stepRef.current = 0;
    setFailureReason(null);
    if (resetRecord) setDidBreakRecordThisAttempt(false);
    setCountdownIndex(0);
    countdownIndexRef.current = 0;
    setRemainingMs(nextData.selectionSeconds * 1000);
    startCountdown(0);
  }

  function resetToIdle() {
    clearGameTimers();
    resolvingRef.current = false;
    const nextData = createMemoryRound(1, MEMORY_SYMBOLS);
    setRound(1);
    roundRef.current = 1;
    setData(nextData);
    dataRef.current = nextData;
    setPhase(PHASE.IDLE);
    phaseRef.current = PHASE.IDLE;
    previousPhaseRef.current = null;
    setStep(0);
    stepRef.current = 0;
    setFailureReason(null);
    setDidBreakRecordThisAttempt(false);
    setCountdownIndex(0);
    countdownIndexRef.current = 0;
    setRemainingMs(nextData.selectionSeconds * 1000);
    setIsExitConfirmOpen(false);
  }

  function requestExit() {
    if (phaseRef.current === PHASE.FAILED) {
      clearGameTimers();
      navigate("/");
      return;
    }
    setIsExitConfirmOpen(true);
  }

  function cancelExit() {
    setIsExitConfirmOpen(false);
  }

  function confirmExit() {
    clearGameTimers();
    setIsExitConfirmOpen(false);
    navigate("/");
  }

  function startGame() {
    if (phaseRef.current !== PHASE.IDLE) return;
    rankingSubmission.startAttempt();
    startRound(1);
  }

  function retryRound() {
    rankingSubmission.startAttempt();
    startRound(roundRef.current);
  }

  function failRound(reason) {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    clearActiveTimer();
    clearRoundTransitionTimer();
    clearCorrectFeedback();
    setFailureReason(reason);
    setPhase(PHASE.FAILED);
    phaseRef.current = PHASE.FAILED;
    void rankingSubmission.submitResult({
      gameKey: RANKING_GAME.MEMORY,
      scoreValue: Math.max(0, roundRef.current - 1),
    });
  }

  function completeRound() {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    clearActiveTimer();
    updateBestCompletedRound(roundRef.current);
    setPhase(PHASE.CLEARED);
    phaseRef.current = PHASE.CLEARED;
    clearRoundTransitionTimer();
    roundTransitionTimerRef.current = window.setTimeout(() => {
      roundTransitionTimerRef.current = null;
      startRound(roundRef.current + 1, { resetRecord: false });
    }, ROUND_TRANSITION_MS);
  }

  function playCorrectButtonMotion(button) {
    if (!button?.animate) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    button.getAnimations?.().forEach((animation) => animation.cancel());
    button.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.1)", offset: 0.42 },
        { transform: "scale(1)" },
      ],
      { duration: 360, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }

  function showCorrectFeedback(symbol) {
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    feedbackSequenceRef.current += 1;
    setCorrectFeedback({ symbolId: symbol.id, sequence: feedbackSequenceRef.current });
    setCorrectAnnouncement(`${symbol.name} 정답`);
    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null;
      setCorrectFeedback(null);
      setCorrectAnnouncement("");
    }, CORRECT_FEEDBACK_MS);
  }

  function choose(symbol, event) {
    if (phaseRef.current !== PHASE.PLAYING || resolvingRef.current) return;
    const currentStep = stepRef.current;
    const result = evaluateMemoryChoice(dataRef.current.sequence, currentStep, symbol.id);
    if (!result.correct) {
      failRound(FAILURE_REASON.WRONG);
      return;
    }
    playCorrectButtonMotion(event.currentTarget);
    showCorrectFeedback(symbol);
    stepRef.current = result.nextStep;
    setStep(result.nextStep);
    if (result.complete) completeRound();
  }

  function pauseGame() {
    if (!canPause || phaseRef.current === PHASE.PAUSED) return;
    previousPhaseRef.current = phaseRef.current;
    clearActiveTimer({ preserve: true });
    setPhase(PHASE.PAUSED);
    phaseRef.current = PHASE.PAUSED;
  }

  function resumeGame() {
    const previousPhase = previousPhaseRef.current;
    if (!previousPhase || phaseRef.current !== PHASE.PAUSED) return;
    setPhase(previousPhase);
    phaseRef.current = previousPhase;
    previousPhaseRef.current = null;
    resumeActiveTimer();
    window.requestAnimationFrame(() => focusElement(pauseButtonRef.current));
  }

  function shouldReveal(index) {
    return phase === PHASE.PREVIEW || index < step || phase === PHASE.CLEARED;
  }

  const resultTitle = didBreakRecordThisAttempt ? "최고기록 갱신!" : "GAME OVER";
  const isTimeoutFailure = failureReason === FAILURE_REASON.TIMEOUT;
  const gameActions = canPause ? (
    <Button ref={pauseButtonRef} className="memory-game__pause" variant="secondary" type="button" onClick={pauseGame}>
      일시정지
    </Button>
  ) : null;
  const sidebar = (
    <>
      <div className="stat-row">
        <div className="stat">
          <div className="l">Round</div>
          <div className="v">{round}</div>
        </div>
        <div className="stat">
          <div className="l">Time</div>
          <div className="v">
            {timerText}
            <small>s</small>
          </div>
        </div>
        <div className="stat">
          <div className="l">Step</div>
          <div className="v">
            {step}
            <small> / {data.count}</small>
          </div>
        </div>
        <div className="stat">
          <div className="l">Best</div>
          <div className="v">
            {best || "-"}
            <small>R</small>
          </div>
        </div>
      </div>
      <p className="game-stage__side-note">라운드 생성, 타이머, 정답 판정은 기존 로직을 그대로 사용합니다.</p>
    </>
  );

  return (
    <GameStage
      className="memory-game"
      eyebrow={game.eyebrow}
      title={game.title}
      description={game.description}
      actions={gameActions}
      sidebar={sidebar}
      fullscreenEnabled
      ariaLabel={game.title}
    >
      <div ref={stageContentRef} className="memory-game__stage-content" aria-hidden={isStageCovered ? "true" : undefined}>
        {phase === PHASE.IDLE ? (
          <section className="memory-game__idle" aria-labelledby="memory-game-start-title">
            <h3 id="memory-game-start-title">순서를 기억해 보세요.</h3>
            <p>3개의 이모지부터 시작해 세 라운드마다 하나씩 늘어나요.</p>
            <Button className="memory-game__primary" type="button" onClick={startGame}>
              게임 시작
            </Button>
          </section>
        ) : (
          <div className="memory-game__play-shell" data-memory-count={data.count} data-phase={phase}>
            <div className="memory-game__timer-row">
              {shouldShowTimer ? (
                <div
                  className={`memory-game__clock${isTimerUrgent ? " is-urgent" : ""}`}
                  aria-label={`남은 시간 ${timerText}초`}
                >
                  <span className="memory-game__clock-body">
                    <StopwatchIcon />
                    <span>{timerText}</span>
                  </span>
                </div>
              ) : null}
            </div>
            <GameItemPanel
              title={`${round} ROUND`}
              variant="problem"
              className="memory-game__problem-panel"
              ariaLabel={`${round}라운드 기억할 순서`}
            >
              <div
                className="memory-sequence"
                data-count={data.count}
                data-density={sequenceDensity}
                aria-label="기억해야 할 이모지 순서"
              >
                {data.sequence.map((item, index) => {
                  const revealed = shouldReveal(index);
                  return (
                    <div
                      className={`memory-sequence__item${revealed ? " is-revealed" : " is-empty"}`}
                      data-revealed={revealed ? "true" : "false"}
                      data-symbol-id={item.id}
                      key={`${round}-${item.id}-${index}`}
                      aria-label={revealed ? `${item.name}, 순서 ${index + 1}` : `${index + 1}번째 순서, 아직 맞히지 않음`}
                    >
                      <span className="memory-sequence__display">
                        {revealed ? <MemorySymbol value={item.symbol} /> : null}
                      </span>
                      <MemoryPedestal />
                    </div>
                  );
                })}
              </div>
            </GameItemPanel>
            <GameItemPanel
              title="순서대로 선택하세요"
              variant="selection"
              className="memory-game__selection-panel"
              ariaLabel="선택할 이모지"
            >
              <div className="memory-card-grid">
                {MEMORY_SYMBOLS.map((symbol) => {
                  const showFeedback = correctFeedback?.symbolId === symbol.id;
                  return (
                    <button
                      type="button"
                      className="memory-card"
                      key={symbol.id}
                      onClick={(event) => choose(symbol, event)}
                      disabled={phase !== PHASE.PLAYING}
                      aria-label={`${symbol.name} 선택`}
                    >
                      <span className="memory-card__content">
                        <MemorySymbol value={symbol.symbol} />
                      </span>
                      {showFeedback ? <CorrectBurst key={correctFeedback.sequence} /> : null}
                    </button>
                  );
                })}
              </div>
              <span className="visually-hidden" aria-live="polite">
                {correctAnnouncement}
              </span>
            </GameItemPanel>
          </div>
        )}
      </div>

      {isStageCovered ? (
        <GameStageOverlay
          className="memory-game__overlay-layer"
          state={isExitConfirmOpen ? "exit-confirm" : phase}
        >
          {isExitConfirmOpen ? (
            <GameStageModal
              className="memory-game__state-view"
              role="dialog"
              aria-modal="true"
              aria-labelledby="memory-game-exit-title"
            >
              <h3 className="memory-game__state-title" id="memory-game-exit-title">
                게임을 나갈까요?
              </h3>
              <p>현재 라운드 진행은 저장되지 않아요.</p>
              <div className="memory-game__state-actions game-stage-modal__actions">
                <Button type="button" onClick={cancelExit}>
                  계속하기
                </Button>
                <Button type="button" variant="secondary" onClick={confirmExit}>
                  게임 나가기
                </Button>
              </div>
            </GameStageModal>
          ) : null}

          {phase === PHASE.COUNTDOWN && !isExitConfirmOpen ? (
            <GameStageModal
              className="memory-game__state-view"
              data-state="countdown"
              role="status"
              aria-live="assertive"
            >
              <p className="memory-game__state-kicker" aria-label={`현재 ${round}라운드`}>
                — {round} ROUND —
              </p>
              <p className="memory-game__state-title memory-game__state-title--countdown">
                {COUNTDOWN_LABELS[countdownIndex]}
              </p>
            </GameStageModal>
          ) : null}

          {phase === PHASE.TURN_READY && !isExitConfirmOpen ? (
            <GameStageModal
              className="memory-game__transition-view memory-game__transition-view--turn"
              data-state="turn-ready"
              role="status"
              aria-live="polite"
            >
              <p className="memory-game__transition-title">YOUR TURN</p>
              <p className="memory-game__transition-copy">순서대로 선택하세요</p>
            </GameStageModal>
          ) : null}

          {phase === PHASE.CLEARED && !isExitConfirmOpen ? (
            <GameStageModal
              className="memory-game__transition-view memory-game__transition-view--clear"
              data-state="cleared"
              role="status"
              aria-live="assertive"
            >
              <p className="memory-game__transition-title">ROUND {round} CLEAR!</p>
            </GameStageModal>
          ) : null}

          {phase === PHASE.PAUSED && !isExitConfirmOpen ? (
            <GameStageModal
              className="memory-game__state-view"
              data-state="paused"
              role="dialog"
              aria-modal="true"
              aria-labelledby="memory-game-pause-title"
            >
              <h3 className="memory-game__state-title" id="memory-game-pause-title">
                일시정지
              </h3>
              <div className="memory-game__state-actions game-stage-modal__actions">
                <Button
                  ref={resumeButtonRef}
                  className="memory-game__state-button"
                  type="button"
                  onClick={resumeGame}
                >
                  계속하기
                </Button>
                <Button
                  className="memory-game__state-button"
                  variant="secondary"
                  type="button"
                  onClick={resetToIdle}
                >
                  처음부터 다시 시작
                </Button>
                <Button
                  className="memory-game__state-button"
                  variant="secondary"
                  type="button"
                  onClick={requestExit}
                >
                  게임 나가기
                </Button>
              </div>
            </GameStageModal>
          ) : null}

          {phase === PHASE.FAILED && !isExitConfirmOpen ? (
            <GameStageModal
              className="memory-game__state-view"
              data-state="failed"
              role="dialog"
              aria-modal="true"
              aria-labelledby="memory-game-result-title"
            >
              <h3
                className="memory-game__state-title memory-game__state-title--failed"
                id="memory-game-result-title"
              >
                {resultTitle}
              </h3>
              <div className="memory-game__state-details">
                <p>{round}라운드 실패</p>
                {isTimeoutFailure ? <p>시간 초과</p> : null}
              </div>
              <ResultSubmissionStatus submission={rankingSubmission} />
              <div className="memory-game__state-actions game-stage-modal__actions">
                <Button
                  ref={retryButtonRef}
                  className="memory-game__state-button"
                  type="button"
                  onClick={retryRound}
                >
                  재도전
                </Button>
                <Button
                  className="memory-game__state-button"
                  variant="secondary"
                  type="button"
                  onClick={resetToIdle}
                >
                  처음부터 다시 시작
                </Button>
                <Button
                  className="memory-game__state-button"
                  variant="secondary"
                  type="button"
                  onClick={requestExit}
                >
                  게임 나가기
                </Button>
              </div>
            </GameStageModal>
          ) : null}
        </GameStageOverlay>
      ) : null}
    </GameStage>
  );
}
