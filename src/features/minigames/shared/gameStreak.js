import { useCallback, useRef, useState } from "react";

export const NEXT_ROUND_LABEL = "다음판!";

export function getStreakCelebrationCopy(streak) {
  const safeStreak = Math.max(0, Math.floor(Number(streak) || 0));

  if (safeStreak >= 10) {
    return {
      title: "놀라워요!",
      subtitle: `${safeStreak}판 연속으로 풀었어요`,
    };
  }
  if (safeStreak >= 5) {
    return {
      title: "대단해요!",
      subtitle: `${safeStreak}판 연속 성공`,
    };
  }
  if (safeStreak >= 3) {
    return {
      title: `${safeStreak}판 연속 성공!`,
      subtitle: "정말 잘했어요",
    };
  }
  if (safeStreak === 2) {
    return {
      title: "2판 연속 성공!",
      subtitle: "잘하고 있어요",
    };
  }
  return {
    title: "완성!",
    subtitle: "잘했어요",
  };
}

export function useGameStreak() {
  const [streak, setStreak] = useState(0);
  const [completionStreak, setCompletionStreak] = useState(0);
  const [streakEligible, setStreakEligible] = useState(true);
  const [hasRevealedAnswer, setHasRevealedAnswer] = useState(false);
  const streakRef = useRef(0);
  const streakEligibleRef = useRef(true);
  const completedRef = useRef(false);

  const beginRound = useCallback(({ preserveStreak = false } = {}) => {
    if (!preserveStreak) {
      streakRef.current = 0;
      setStreak(0);
    }
    completedRef.current = false;
    streakEligibleRef.current = true;
    setCompletionStreak(0);
    setStreakEligible(true);
    setHasRevealedAnswer(false);
  }, []);

  const disqualifyRound = useCallback(({ answerRevealed = false } = {}) => {
    streakRef.current = 0;
    streakEligibleRef.current = false;
    setStreak(0);
    setCompletionStreak(0);
    setStreakEligible(false);
    if (answerRevealed) setHasRevealedAnswer(true);
  }, []);

  const recordSuccess = useCallback(() => {
    if (completedRef.current) return null;
    completedRef.current = true;
    const nextStreak = streakEligibleRef.current ? streakRef.current + 1 : 0;
    streakRef.current = nextStreak;
    setStreak(nextStreak);
    setCompletionStreak(nextStreak);
    return nextStreak;
  }, []);

  return {
    beginRound,
    completionStreak,
    disqualifyRound,
    hasRevealedAnswer,
    recordSuccess,
    streak,
    streakEligible,
  };
}
