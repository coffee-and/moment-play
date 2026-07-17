import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useGameFeedback } from "../feedback/GameFeedbackContext.jsx";
import { GameAudioEngine } from "./audioEngine.js";
import {
  getAudioTrackForPath,
  readAudioPreference,
  writeAudioPreference,
} from "./audioCatalog.js";
import "./audio.css";

const NOOP = () => {};
const GameAudioContext = createContext({
  enabled: true,
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
  const [enabled, setEnabled] = useState(readAudioPreference);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockHint, setShowUnlockHint] = useState(false);

  if (!engineRef.current) engineRef.current = new GameAudioEngine();

  const unlockAudio = useCallback(async () => {
    if (!enabled) return false;
    const unlocked = await engineRef.current.unlock();
    setIsUnlocked(unlocked);
    if (unlocked) setShowUnlockHint(false);
    return unlocked;
  }, [enabled]);

  const toggleAudio = useCallback(async () => {
    if (enabled && isUnlocked) {
      setEnabled(false);
      setIsUnlocked(false);
      writeAudioPreference(false);
      engineRef.current.setEnabled(false);
      return;
    }

    setEnabled(true);
    writeAudioPreference(true);
    engineRef.current.setEnabled(true);
    const unlocked = await engineRef.current.unlock();
    setIsUnlocked(unlocked);
    setShowUnlockHint(!unlocked);
  }, [enabled, isUnlocked]);

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
    if (!enabled || isUnlocked) return undefined;
    const hintTimer = window.setTimeout(() => setShowUnlockHint(true), 1100);
    const unlockFromInteraction = () => {
      void unlockAudio();
    };
    document.addEventListener("pointerdown", unlockFromInteraction, { once: true, capture: true });
    document.addEventListener("keydown", unlockFromInteraction, { once: true, capture: true });
    return () => {
      window.clearTimeout(hintTimer);
      document.removeEventListener("pointerdown", unlockFromInteraction, { capture: true });
      document.removeEventListener("keydown", unlockFromInteraction, { capture: true });
    };
  }, [enabled, isUnlocked, unlockAudio]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        void engineRef.current.suspend();
      } else if (enabled && isUnlocked) {
        void engineRef.current.resume();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
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
      {showUnlockHint && enabled && !isUnlocked ? (
        <button className="sound-unlock-hint" type="button" onClick={() => void toggleAudio()}>
          음악을 들으려면 스피커를 눌러주세요
        </button>
      ) : null}
    </GameAudioContext.Provider>
  );
}

export function useGameAudio() {
  return useContext(GameAudioContext);
}
