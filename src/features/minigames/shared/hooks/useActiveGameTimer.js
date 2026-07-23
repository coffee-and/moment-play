import { useEffect, useRef, useState } from "react";

export function useActiveGameTimer(isRunning) {
  const accumulatedRef = useRef(0);
  const startedAtRef = useRef(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      if (startedAtRef.current != null) {
        accumulatedRef.current += Date.now() - startedAtRef.current;
        startedAtRef.current = null;
        setElapsedMs(accumulatedRef.current);
      }
      return undefined;
    }

    if (startedAtRef.current == null) startedAtRef.current = Date.now();
    const update = () => setElapsedMs(accumulatedRef.current + Date.now() - startedAtRef.current);
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  function resetTimer() {
    accumulatedRef.current = 0;
    startedAtRef.current = isRunning ? Date.now() : null;
    setElapsedMs(0);
  }

  return { elapsedMs, resetTimer };
}

export function formatActiveGameTime(elapsedMs) {
  const totalSeconds = Math.max(0, Math.floor((Number(elapsedMs) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
