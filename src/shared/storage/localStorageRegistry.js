export const GAME_RECORD_STORAGE_KEYS = Object.freeze({
  BLOCK_BLAST_BEST_SCORE: "eunContents.blockBlast.bestScore",
  FLAPPY_BEST_SCORE: "eunContents.flappy.best",
  GAME_2048_BEST_SCORE: "eunContents.game2048.bestScore",
  GLOW_SEQUENCE_BEST_ROUND: "eunContents.glowSequence.bestRound",
  LITS_BEST_TIME: "eunContents.lits.bestTime",
  MEMORY_BEST_ROUND: "eunContents.memoryOrderGame.bestRound",
  MINESWEEPER_BEST_TIME: "eunContents.minesweeper.bestTime",
  MOSAIC_BEST_TIME: "eunContents.mosaic.bestTime",
  SET_BEST_TIME: "eunContents.set.bestTime",
  SHIKAKU_BEST_TIME: "eunContents.shikaku.bestTime",
  SOLITAIRE_RECORDS: "moment-play:solitaire-records:v1",
  SUDOKU_RECORDS: "eunContents.sudoku.records",
  TIMING_TAP_BEST_SCORE: "eunContents.timingTap.best",
});

export const LOCAL_STORAGE_KEYS = Object.freeze({
  PROFILE_NICKNAME: "eunContents.profile.nickname",
  STORAGE_PROBE: "eunContents.storageProbe",
  THEME: "momentPlay.theme",
});

export const LOCAL_STORAGE_PREFIXES = Object.freeze({
  INVITE_RESULTS_SEEN: "moment-play.invite-results-seen",
});

export const RESETTABLE_LOCAL_DATA_KEYS = Object.freeze([
  ...Object.values(GAME_RECORD_STORAGE_KEYS),
  LOCAL_STORAGE_KEYS.PROFILE_NICKNAME,
]);

// Keep clearing old play-data keys that predate the registry. Registered keys
// are still listed explicitly above so a future key cannot be omitted merely
// because it uses a different namespace, as the Solitaire record key does.
export const RESETTABLE_LOCAL_DATA_PREFIXES = Object.freeze([
  "eunContents.",
]);
