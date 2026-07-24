import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function readBestTime(storageKey) {
  try {
    const value = Number(window.localStorage.getItem(storageKey));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
  } catch {
    return null;
  }
}

function saveBestTime(storageKey, seconds) {
  try {
    window.localStorage.setItem(storageKey, String(seconds));
  } catch {
    // Local records are optional.
  }
}

export function usePuzzleSession(storageKey) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bestTime, setBestTime] = useState(() => readBestTime(storageKey));
  const [isExitOpen, setIsExitOpen] = useState(false);
  const startedAtRef = useRef(0);
  const elapsedBeforeStartRef = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const updateElapsed = useCallback(() => {
    const elapsedMs = elapsedBeforeStartRef.current + (Date.now() - startedAtRef.current);
    const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
    setElapsedSeconds(seconds);
    return seconds;
  }, []);

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const timer = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(timer);
  }, [phase, updateElapsed]);

  const start = useCallback(() => {
    elapsedBeforeStartRef.current = 0;
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    setIsExitOpen(false);
    setPhase("playing");
  }, []);

  const complete = useCallback(() => {
    if (phaseRef.current !== "playing") return null;
    const finalSeconds = Math.max(1, updateElapsed());
    elapsedBeforeStartRef.current = finalSeconds * 1000;
    setPhase("completed");
    setBestTime((current) => {
      if (current != null && current <= finalSeconds) return current;
      saveBestTime(storageKey, finalSeconds);
      return finalSeconds;
    });
    return finalSeconds;
  }, [storageKey, updateElapsed]);

  const fail = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const finalSeconds = updateElapsed();
    elapsedBeforeStartRef.current = finalSeconds * 1000;
    setPhase("failed");
  }, [updateElapsed]);

  const requestExit = useCallback(() => {
    if (["idle", "completed", "failed"].includes(phaseRef.current)) {
      navigate("/");
      return;
    }
    if (phaseRef.current === "paused") {
      setIsExitOpen(true);
      return;
    }
    const seconds = updateElapsed();
    elapsedBeforeStartRef.current = seconds * 1000;
    setPhase("paused");
    setIsExitOpen(true);
  }, [navigate, updateElapsed]);

  const continueGame = useCallback(() => {
    startedAtRef.current = Date.now();
    setIsExitOpen(false);
    setPhase("playing");
  }, []);

  const pause = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const seconds = updateElapsed();
    elapsedBeforeStartRef.current = seconds * 1000;
    setPhase("paused");
  }, [updateElapsed]);

  const resume = useCallback(() => {
    if (phaseRef.current !== "paused" || isExitOpen) return;
    startedAtRef.current = Date.now();
    setPhase("playing");
  }, [isExitOpen]);

  const surrender = useCallback(() => {
    if (phaseRef.current !== "paused" && phaseRef.current !== "playing") return;
    setPhase("surrendered");
  }, []);

  const leaveGame = useCallback(() => navigate("/"), [navigate]);

  return {
    bestTime,
    complete,
    continueGame,
    elapsedSeconds,
    fail,
    isExitOpen,
    leaveGame,
    pause,
    phase,
    requestExit,
    resume,
    start,
    surrender,
  };
}
