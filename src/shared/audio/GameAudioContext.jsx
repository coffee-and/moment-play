import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useGameFeedback } from "../feedback/GameFeedbackContext.jsx";
import { GameAudioEngine } from "./audioEngine.js";
import { getAudioTrackForPath } from "./audioCatalog.js";
import "./audio.css";

const NOOP = () => {};
const GameAudioContext = createContext({
  enabled: false,
  isAudible: false,
  playSound: NOOP,
  popDucking: NOOP,
  pushDucking: NOOP,
  toggleAudio: NOOP,
  unlockAudio: async () => false,
});

export function GameAudioProvider({ children }) {
  const location = useLocation();
  const { triggerFeedback } = useGameFeedback();
  const engineRef = useRef(null);
  const duckCountRef = useRef(0);
  const [enabled, setEnabled] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  if (!engineRef.current) engineRef.current = new GameAudioEngine();

  const unlockAudio = useCallback(async () => {
    if (!enabled) return false;
    const unlocked = await engineRef.current.unlock();
    setIsUnlocked(unlocked);
    return unlocked;
  }, [enabled]);

  const toggleAudio = useCallback(async () => {
    if (enabled) {
      setEnabled(false);
      setIsUnlocked(false);
      engineRef.current.setEnabled(false);
      return;
    }

    setEnabled(true);
    engineRef.current.setEnabled(true);
    const unlocked = await engineRef.current.unlock();
    setIsUnlocked(unlocked);
  }, [enabled]);

  const playSound = useCallback((sound) => {
    triggerFeedback(sound);
    engineRef.current.playSound(sound);
  }, [triggerFeedback]);

  const pushDucking = useCallback(() => {
    duckCountRef.current += 1;
    engineRef.current.setDucked(true);
  }, []);

  const popDucking = useCallback(() => {
    duckCountRef.current = Math.max(0, duckCountRef.current - 1);
    engineRef.current.setDucked(duckCountRef.current > 0);
  }, []);

  useEffect(() => {
    engineRef.current.setEnabled(enabled);
    engineRef.current.setTrack(getAudioTrackForPath(location.pathname));
  }, [enabled, location.pathname]);

  useEffect(() => {
    function suspendAudio() {
      void engineRef.current.suspend();
    }

    function resumeAudio() {
      if (enabled && isUnlocked) void engineRef.current.resume();
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        suspendAudio();
      } else {
        resumeAudio();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", suspendAudio);
    window.addEventListener("pageshow", resumeAudio);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", suspendAudio);
      window.removeEventListener("pageshow", resumeAudio);
    };
  }, [enabled, isUnlocked]);

  useEffect(() => () => engineRef.current.destroy(), []);

  const value = useMemo(() => ({
    enabled,
    isAudible: enabled && isUnlocked,
    playSound,
    popDucking,
    pushDucking,
    toggleAudio,
    unlockAudio,
  }), [enabled, isUnlocked, playSound, popDucking, pushDucking, toggleAudio, unlockAudio]);

  return (
    <GameAudioContext.Provider value={value}>
      {children}
    </GameAudioContext.Provider>
  );
}

export function useGameAudio() {
  return useContext(GameAudioContext);
}
