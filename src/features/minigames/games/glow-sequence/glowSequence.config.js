export const GLOW_SEQUENCE_START_ROUND = 1;
export const GLOW_SEQUENCE_STANDARD_END_ROUND = 20;
export const GLOW_SEQUENCE_MASTER_END_ROUND = 60;
export const GLOW_SEQUENCE_MASTER_LENGTH = 16;
export const GLOW_SEQUENCE_GRID_SIZE = 4;
export const GLOW_SEQUENCE_MILESTONE_INTERVAL = 10;

export const GLOW_SEQUENCE_PHASE = Object.freeze({
  IDLE: "idle",
  SHOWING: "showing",
  INPUT: "input",
  RETRY: "retry",
  ROUND_CLEARED: "round-cleared",
  STANDARD_COMPLETE: "standard-complete",
  MASTER_COMPLETE: "master-complete",
  PAUSED: "paused",
});

export const GLOW_SEQUENCE_ROUND_OUTCOME = Object.freeze({
  CONTINUE: "continue",
  STANDARD_COMPLETE: "standard-complete",
  MASTER_COMPLETE: "master-complete",
});

export const GLOW_SEQUENCE_TIMING = Object.freeze({
  PLAYBACK_LEAD_MS: 520,
  PLAYBACK_ON_MS: 430,
  PLAYBACK_GAP_MS: 150,
  CELL_FEEDBACK_MS: 190,
  RETRY_DELAY_MS: 850,
  ROUND_CLEAR_MS: 1000,
});
