export const AUDIO_PREFERENCE_KEY = "eunContents.audio.enabled";

export const AUDIO_TRACK = {
  HOME: "home",
  GAME_2048: "2048",
  MEMORY: "memory",
  SUDOKU: "sudoku",
  OMOK: "omok",
  SNAKE: "snake",
  TIMING_TAP: "timing-tap",
};

export const AUDIO_TRACKS = {
  [AUDIO_TRACK.HOME]: {
    stepMs: 820,
    duration: 1.45,
    waveform: "sine",
    volume: 0.05,
    notes: [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23],
  },
  [AUDIO_TRACK.GAME_2048]: {
    stepMs: 560,
    duration: 0.74,
    waveform: "triangle",
    volume: 0.04,
    notes: [220, 277.18, 329.63, 440, 329.63, 277.18, 246.94, 329.63],
  },
  [AUDIO_TRACK.MEMORY]: {
    stepMs: 610,
    duration: 0.62,
    waveform: "sine",
    volume: 0.046,
    notes: [523.25, 659.25, 783.99, null, 587.33, 698.46, 880, null],
  },
  [AUDIO_TRACK.SUDOKU]: {
    stepMs: 920,
    duration: 1.7,
    waveform: "sine",
    volume: 0.042,
    notes: [220, 261.63, 329.63, 293.66, 246.94, 293.66, 349.23, 261.63],
  },
  [AUDIO_TRACK.OMOK]: {
    stepMs: 760,
    duration: 1.08,
    waveform: "triangle",
    volume: 0.038,
    notes: [196, 246.94, 293.66, null, 220, 261.63, 329.63, null],
  },
  [AUDIO_TRACK.SNAKE]: {
    stepMs: 360,
    duration: 0.34,
    waveform: "square",
    volume: 0.02,
    notes: [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 440],
  },
  [AUDIO_TRACK.TIMING_TAP]: {
    stepMs: 430,
    duration: 0.38,
    waveform: "triangle",
    volume: 0.034,
    notes: [220, null, 330, 440, 220, 330, null, 493.88],
  },
};

export function getAudioTrackForPath(pathname) {
  const match = /^\/minigames\/([^/]+)/.exec(pathname);
  if (!match) return AUDIO_TRACK.HOME;
  return Object.values(AUDIO_TRACK).includes(match[1]) ? match[1] : AUDIO_TRACK.HOME;
}

export function readAudioPreference(storage = globalThis.localStorage) {
  try {
    const stored = storage?.getItem(AUDIO_PREFERENCE_KEY);
    return stored == null ? true : stored === "true";
  } catch {
    return true;
  }
}

export function writeAudioPreference(enabled, storage = globalThis.localStorage) {
  try {
    storage?.setItem(AUDIO_PREFERENCE_KEY, String(enabled));
  } catch {
    return;
  }
}
