import { FLAPPY_CONFIG } from "./flappyConfig.js";

export const FLAPPY_SESSION_MODE = Object.freeze({
  COURSE: "course",
  ENDLESS: "endless",
});

export function createFlappyCourseSession() {
  return {
    mode: FLAPPY_SESSION_MODE.COURSE,
    round: 1,
    roundElapsedMs: 0,
    totalElapsedMs: 0,
  };
}

export function createFlappyEndlessSession() {
  return {
    mode: FLAPPY_SESSION_MODE.ENDLESS,
    round: FLAPPY_CONFIG.courseRoundCount,
    roundElapsedMs: 0,
    totalElapsedMs: 0,
  };
}

export function advanceFlappySession(session, deltaMs) {
  const elapsedMs = Math.max(0, deltaMs);

  if (session.mode === FLAPPY_SESSION_MODE.ENDLESS) {
    return {
      event: null,
      session: {
        ...session,
        roundElapsedMs: session.roundElapsedMs + elapsedMs,
        totalElapsedMs: session.totalElapsedMs + elapsedMs,
      },
    };
  }

  const nextRoundElapsedMs = session.roundElapsedMs + elapsedMs;
  const nextTotalElapsedMs = session.totalElapsedMs + elapsedMs;
  if (nextRoundElapsedMs < FLAPPY_CONFIG.roundDurationMs) {
    return {
      event: null,
      session: {
        ...session,
        roundElapsedMs: nextRoundElapsedMs,
        totalElapsedMs: nextTotalElapsedMs,
      },
    };
  }

  if (session.round >= FLAPPY_CONFIG.courseRoundCount) {
    return {
      event: "course-complete",
      session: {
        ...session,
        roundElapsedMs: FLAPPY_CONFIG.roundDurationMs,
        totalElapsedMs: FLAPPY_CONFIG.courseRoundCount * FLAPPY_CONFIG.roundDurationMs,
      },
    };
  }

  return {
    event: "round-complete",
    session: {
      ...session,
      round: session.round + 1,
      roundElapsedMs: nextRoundElapsedMs - FLAPPY_CONFIG.roundDurationMs,
      totalElapsedMs: nextTotalElapsedMs,
    },
  };
}

export function getFlappySessionDifficulty(session) {
  return {
    endlessElapsedMs: session.mode === FLAPPY_SESSION_MODE.ENDLESS
      ? session.totalElapsedMs
      : 0,
    mode: session.mode,
    round: session.round,
  };
}

export function getFlappyTimeRemainingMs(session) {
  if (session.mode === FLAPPY_SESSION_MODE.ENDLESS) return null;
  return Math.max(0, FLAPPY_CONFIG.roundDurationMs - session.roundElapsedMs);
}

export function formatFlappyClock(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function createFlappyCourseMetrics(world) {
  return {
    courseMaxCombo: world.maxCombo,
    courseMistakes: world.mistakes,
    courseScore: world.score,
  };
}

export function createFlappyEndlessMetrics(world, session) {
  return {
    endlessGates: world.gatesPassed,
    endlessScore: world.score,
    survivalMs: Math.round(session.totalElapsedMs),
  };
}
