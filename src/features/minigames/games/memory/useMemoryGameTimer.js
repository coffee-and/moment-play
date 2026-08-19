import { useCallback, useEffect, useRef } from "react";

export function useMemoryGameTimer({ onComplete, onTick }) {
  const timerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);
  onCompleteRef.current = onComplete;
  onTickRef.current = onTick;

  const clearTimer = useCallback(() => {
    const timer = timerRef.current;
    if (!timer) return;
    window.clearTimeout(timer.timeoutId);
    window.clearInterval(timer.intervalId);
    timerRef.current = null;
  }, []);

  const runTimer = useCallback((kind, durationMs) => {
    clearTimer();
    const safeDuration = Math.max(0, durationMs);
    const deadline = performance.now() + safeDuration;
    const updateRemaining = () => {
      onTickRef.current(kind, Math.max(0, deadline - performance.now()));
    };
    updateRemaining();

    const intervalId = window.setInterval(updateRemaining, 50);
    const timeoutId = window.setTimeout(() => {
      clearTimer();
      onCompleteRef.current(kind);
    }, safeDuration);
    timerRef.current = {
      deadline,
      durationMs: safeDuration,
      intervalId,
      kind,
      remainingMs: safeDuration,
      timeoutId,
    };
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    const timer = timerRef.current;
    if (!timer) return;
    window.clearTimeout(timer.timeoutId);
    window.clearInterval(timer.intervalId);
    timerRef.current = {
      ...timer,
      intervalId: null,
      remainingMs: Math.max(0, timer.deadline - performance.now()),
      timeoutId: null,
    };
  }, []);

  const resumeTimer = useCallback(() => {
    const timer = timerRef.current;
    if (!timer) return;
    runTimer(timer.kind, timer.remainingMs);
  }, [runTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { clearTimer, pauseTimer, resumeTimer, runTimer };
}
