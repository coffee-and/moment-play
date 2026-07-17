import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const FEEDBACK_KIND = {
  countdownFinal: "start",
  correct: "positive",
  success: "perfect",
  clear: "clear",
  wrong: "negative",
  gameOver: "game-over",
};

const NOOP = () => {};
const GameFeedbackContext = createContext({
  feedback: null,
  triggerFeedback: NOOP,
});

export function GameFeedbackProvider({ children }) {
  const [feedback, setFeedback] = useState(null);
  const sequenceRef = useRef(0);
  const clearTimerRef = useRef(null);

  const triggerFeedback = useCallback((sound) => {
    const kind = FEEDBACK_KIND[sound];
    if (!kind) return;

    sequenceRef.current += 1;
    const id = sequenceRef.current;
    setFeedback({ id, kind });
    window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => {
      setFeedback((current) => current?.id === id ? null : current);
    }, kind === "clear" || kind === "game-over" ? 1000 : 720);
  }, []);

  useEffect(() => () => window.clearTimeout(clearTimerRef.current), []);

  const value = useMemo(() => ({ feedback, triggerFeedback }), [feedback, triggerFeedback]);

  return (
    <GameFeedbackContext.Provider value={value}>
      {children}
    </GameFeedbackContext.Provider>
  );
}

export function useGameFeedback() {
  return useContext(GameFeedbackContext);
}
