export const MEMORY_COUNTDOWN_LABELS = ["3", "2", "1", "START!"];

export const MEMORY_TIMING = {
  COUNTDOWN_STEP_MS: 1000,
  ROUND_CLEAR_DURATION_MS: 1400,
  INPUT_GUIDE_DURATION_MS: 1200,
  CORRECT_FEEDBACK_MS: 720,
};

export const MEMORY_PHASE = {
  IDLE: "idle",
  COUNTDOWN: "countdown",
  PREVIEW: "preview",
  TURN_READY: "turn-ready",
  PLAYING: "playing",
  PAUSED: "paused",
  CLEARED: "cleared",
  FAILED: "failed",
  REPLAYING: "replaying",
  COMPLETED: "completed",
};

export const MEMORY_FAILURE_REASON = {
  WRONG: "wrong",
  TIMEOUT: "timeout",
};

export const MEMORY_SYMBOLS = [
  { id: "heart", symbol: "❤️", name: "하트" },
  { id: "sun", symbol: "☀️", name: "햇님" },
  { id: "ribbon", symbol: "🎀", name: "리본" },
  { id: "diamond", symbol: "💎", name: "다이아몬드" },
  { id: "sparkles", symbol: "✨", name: "반짝이" },
  { id: "drop", symbol: "💧", name: "물방울" },
  { id: "leaf", symbol: "🍃", name: "나뭇잎" },
  { id: "blossom", symbol: "🌸", name: "꽃" },
];

export function isMemoryTimerUrgent(phase, remainingMs) {
  return (phase === MEMORY_PHASE.PREVIEW || phase === MEMORY_PHASE.PLAYING)
    && remainingMs > 0
    && remainingMs <= 3000;
}
