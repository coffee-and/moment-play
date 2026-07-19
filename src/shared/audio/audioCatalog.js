export const AUDIO_PREFERENCE_KEY = "eunContents.audio.enabled";

export const AUDIO_TRACK = {
  HOME: "home",
  GAME_2048: "2048",
  MEMORY: "memory",
  SUDOKU: "sudoku",
  OMOK: "omok",
  FLAPPY: "flappy",
  TIMING_TAP: "timing-tap",
};

const SEMITONE = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function noteFrequency(note) {
  if (note == null || typeof note === "number") return note;

  const match = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  if (!match) throw new Error(`Invalid audio note: ${note}`);

  const [, letter, accidental, octaveText] = match;
  const accidentalOffset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const midi = (Number(octaveText) + 1) * 12 + SEMITONE[letter] + accidentalOffset;
  return Number((440 * 2 ** ((midi - 69) / 12)).toFixed(2));
}

function score(...events) {
  return events.map((event) => (
    Array.isArray(event) ? event.map(noteFrequency) : noteFrequency(event)
  ));
}

export const AUDIO_TRACKS = {
  [AUDIO_TRACK.HOME]: {
    stepMs: 390,
    echo: { delaySeconds: 0.24, feedback: 0.16, wet: 0.2 },
    layers: [
      {
        id: "melody",
        waveform: "triangle",
        volume: 0.055,
        duration: 0.56,
        attack: 0.045,
        notes: score(
          "D5", "F5", "A5", "C6", "A5", "F5", "E5", "D5",
          "F5", "A5", "D6", "C6", "A5", "G5", "F5", null,
          "A5", "C6", "F6", "E6", "C6", "A5", "G5", "F5",
          "E5", "G5", "C6", "A5", "G5", "E5", "D5", null,
        ),
      },
      {
        id: "harp",
        waveform: "sine",
        volume: 0.026,
        duration: 0.38,
        attack: 0.018,
        notes: score(
          "D4", "A4", "F5", "A4", "D5", "A4", "F5", "A4",
          "Bb3", "F4", "D5", "F4", "Bb4", "F4", "D5", "F4",
          "F4", "C5", "A5", "C5", "F5", "C5", "A5", "C5",
          "C4", "G4", "E5", "G4", "C5", "G4", "E5", "G4",
        ),
      },
      {
        id: "pad",
        waveform: "sine",
        volume: 0.018,
        duration: 3.3,
        attack: 0.42,
        strumMs: 28,
        notes: score(
          ["D3", "A3", "D4", "F4"], null, null, null, null, null, null, null,
          ["Bb2", "F3", "Bb3", "D4"], null, null, null, null, null, null, null,
          ["F3", "C4", "F4", "A4"], null, null, null, null, null, null, null,
          ["C3", "G3", "C4", "E4"], null, null, null, null, null, null, null,
        ),
      },
      {
        id: "bass",
        waveform: "triangle",
        volume: 0.042,
        duration: 1.12,
        attack: 0.08,
        notes: score(
          "D2", null, null, "A2", "D3", null, "A2", null,
          "Bb1", null, null, "F2", "Bb2", null, "F2", null,
          "F2", null, null, "C3", "F3", null, "C3", null,
          "C2", null, null, "G2", "C3", null, "G2", null,
        ),
      },
      {
        id: "sparkle",
        waveform: "sine",
        volume: 0.022,
        duration: 0.82,
        attack: 0.02,
        notes: score(
          null, null, "D6", null, null, "A5", null, null,
          null, "F6", null, null, "D6", null, null, "A5",
          null, null, "C6", null, "F6", null, null, "A5",
          null, "G6", null, null, "E6", null, "D6", null,
        ),
      },
    ],
  },
  [AUDIO_TRACK.GAME_2048]: {
    stepMs: 330,
    echo: { delaySeconds: 0.18, feedback: 0.12, wet: 0.14 },
    layers: [
      {
        id: "melody",
        waveform: "triangle",
        volume: 0.058,
        duration: 0.42,
        attack: 0.03,
        notes: score(
          "A4", "C5", "E5", "G5", "E5", "C5", "B4", "E5",
          "F5", "A5", "C6", "A5", "G5", "E5", "D5", null,
        ),
      },
      {
        id: "clockwork",
        waveform: "sine",
        volume: 0.028,
        duration: 0.23,
        attack: 0.012,
        notes: score(
          "A3", "E4", "C5", "E4", "A4", "E4", "C5", "E4",
          "F3", "C4", "A4", "C4", "G3", "D4", "B4", "D4",
        ),
      },
      {
        id: "pad",
        waveform: "sine",
        volume: 0.017,
        duration: 2.5,
        attack: 0.3,
        strumMs: 20,
        notes: score(
          ["A2", "E3", "A3", "C4"], null, null, null, null, null, null, null,
          ["F2", "C3", "F3", "A3"], null, null, null,
          ["G2", "D3", "G3", "B3"], null, null, null,
        ),
      },
      {
        id: "bass",
        waveform: "triangle",
        volume: 0.046,
        duration: 0.62,
        attack: 0.025,
        notes: score(
          "A2", null, "A2", null, "E2", null, "A2", null,
          "F2", null, "C3", null, "G2", null, "D3", null,
        ),
      },
    ],
  },
  [AUDIO_TRACK.MEMORY]: {
    stepMs: 420,
    echo: { delaySeconds: 0.27, feedback: 0.18, wet: 0.24 },
    layers: [
      {
        id: "crystal-melody",
        waveform: "sine",
        volume: 0.058,
        duration: 0.72,
        attack: 0.025,
        notes: score(
          "C5", "E5", "G5", "B5", "A5", "G5", "E5", null,
          "D5", "F5", "A5", "C6", "B5", "G5", "E5", null,
        ),
      },
      {
        id: "harp",
        waveform: "triangle",
        volume: 0.026,
        duration: 0.36,
        attack: 0.018,
        notes: score(
          "C4", "G4", "E5", "G4", "A3", "E4", "C5", "E4",
          "D4", "A4", "F5", "A4", "G3", "D4", "B4", "D4",
        ),
      },
      {
        id: "pad",
        waveform: "sine",
        volume: 0.017,
        duration: 3.15,
        attack: 0.5,
        strumMs: 32,
        notes: score(
          ["C3", "G3", "C4", "E4", "B4"], null, null, null, null, null, null, null,
          ["D3", "A3", "D4", "F4", "C5"], null, null, null,
          ["G2", "D3", "G3", "B3"], null, null, null,
        ),
      },
      {
        id: "bass",
        waveform: "triangle",
        volume: 0.039,
        duration: 1.1,
        attack: 0.09,
        notes: score(
          "C2", null, null, "G2", "A2", null, "E2", null,
          "D2", null, null, "A2", "G2", null, "D2", null,
        ),
      },
      {
        id: "glint",
        waveform: "sine",
        volume: 0.02,
        duration: 0.9,
        attack: 0.015,
        notes: score(
          null, "C6", null, null, "E6", null, "B5", null,
          null, "D6", null, "A5", null, "G6", null, null,
        ),
      },
    ],
  },
  [AUDIO_TRACK.SUDOKU]: {
    stepMs: 510,
    echo: { delaySeconds: 0.3, feedback: 0.14, wet: 0.2 },
    layers: [
      {
        id: "melody",
        waveform: "sine",
        volume: 0.055,
        duration: 0.88,
        attack: 0.07,
        notes: score(
          "E4", "G4", "B4", "F#5", "E5", "B4", "A4", null,
          "C5", "E5", "G5", "F#5", "D5", "B4", "A4", null,
          "B4", "D5", "F#5", "A5", "G5", "E5", "D5", null,
        ),
      },
      {
        id: "ink-drop",
        waveform: "triangle",
        volume: 0.025,
        duration: 0.46,
        attack: 0.025,
        notes: score(
          "E3", "B3", "G4", "B3", "E4", "B3", "G4", "B3",
          "C3", "G3", "E4", "G3", "D3", "A3", "F#4", "A3",
          "B2", "F#3", "D4", "F#3", "E3", "B3", "G4", "B3",
        ),
      },
      {
        id: "pad",
        waveform: "sine",
        volume: 0.019,
        duration: 3.8,
        attack: 0.58,
        strumMs: 34,
        notes: score(
          ["E2", "B2", "E3", "G3"], null, null, null, null, null, null, null,
          ["C3", "G3", "C4", "E4"], null, null, null,
          ["D3", "A3", "D4", "F#4"], null, null, null,
          ["B2", "F#3", "B3", "D4"], null, null, null,
          ["E3", "B3", "E4", "G4"], null, null, null,
        ),
      },
      {
        id: "bass",
        waveform: "triangle",
        volume: 0.043,
        duration: 1.5,
        attack: 0.11,
        notes: score(
          "E2", null, null, null, "B2", null, null, null,
          "C2", null, null, "G2", "D2", null, null, "A2",
          "B1", null, null, "F#2", "E2", null, "B2", null,
        ),
      },
    ],
  },
  [AUDIO_TRACK.OMOK]: {
    stepMs: 450,
    echo: { delaySeconds: 0.26, feedback: 0.15, wet: 0.19 },
    layers: [
      {
        id: "moon-melody",
        waveform: "triangle",
        volume: 0.056,
        duration: 0.7,
        attack: 0.055,
        notes: score(
          "D4", "F4", "A4", "C5", "A4", "G4", "F4", null,
          "D4", "G4", "A4", "D5", "C5", "A4", "G4", null,
          "F4", "A4", "C5", "F5", "D5", "C5", "A4", null,
        ),
      },
      {
        id: "plucked-string",
        waveform: "sine",
        volume: 0.028,
        duration: 0.32,
        attack: 0.015,
        notes: score(
          "D3", "A3", "D4", "F4", "A3", "D4", "F4", "A4",
          "G2", "D3", "G3", "A3", "D4", "G4", "A4", "D5",
          "F3", "C4", "F4", "A4", "C4", "F4", "A4", "C5",
        ),
      },
      {
        id: "pad",
        waveform: "sine",
        volume: 0.018,
        duration: 3.25,
        attack: 0.52,
        strumMs: 42,
        notes: score(
          ["D2", "A2", "D3", "F3"], null, null, null, null, null, null, null,
          ["G2", "D3", "G3", "A3"], null, null, null, null, null, null, null,
          ["F2", "C3", "F3", "A3"], null, null, null,
          ["C3", "G3", "C4", "E4"], null, null, null,
        ),
      },
      {
        id: "bass",
        waveform: "triangle",
        volume: 0.044,
        duration: 1.25,
        attack: 0.1,
        notes: score(
          "D2", null, null, "A2", "D3", null, "A2", null,
          "G2", null, null, "D3", "G2", null, "A2", null,
          "F2", null, null, "C3", "F2", null, "C3", null,
        ),
      },
    ],
  },
  [AUDIO_TRACK.FLAPPY]: {
    stepMs: 320,
    echo: { delaySeconds: 0.22, feedback: 0.16, wet: 0.18 },
    layers: [
      {
        id: "sky-melody",
        waveform: "triangle",
        volume: 0.054,
        duration: 0.44,
        attack: 0.025,
        notes: score(
          "D5", "F5", "A5", null, "G5", "E5", "D5", "A4",
          "Bb4", "D5", "F5", "A5", "G5", "E5", "D5", null,
        ),
      },
      {
        id: "wing-arp",
        waveform: "sine",
        volume: 0.025,
        duration: 0.27,
        attack: 0.012,
        notes: score(
          "D4", "A4", "F5", "A4", "C4", "G4", "E5", "G4",
          "Bb3", "F4", "D5", "F4", "C4", "G4", "E5", "G4",
        ),
      },
      {
        id: "cloud-pad",
        waveform: "sine",
        volume: 0.016,
        duration: 2.4,
        attack: 0.38,
        strumMs: 26,
        notes: score(
          ["D3", "A3", "D4", "F4"], null, null, null, null, null, null, null,
          ["Bb2", "F3", "Bb3", "D4"], null, null, null,
          ["C3", "G3", "C4", "E4"], null, null, null,
        ),
      },
      {
        id: "flight-bass",
        waveform: "triangle",
        volume: 0.042,
        duration: 0.66,
        attack: 0.035,
        notes: score(
          "D2", null, "A2", null, "C2", null, "G2", null,
          "Bb1", null, "F2", null, "C2", null, "G2", null,
        ),
      },
      {
        id: "starlight",
        waveform: "sine",
        volume: 0.019,
        duration: 0.76,
        attack: 0.015,
        notes: score(
          null, "D6", null, null, "A5", null, "E6", null,
          null, "F6", null, "D6", null, "G6", null, null,
        ),
      },
    ],
  },
  [AUDIO_TRACK.TIMING_TAP]: {
    stepMs: 300,
    echo: { delaySeconds: 0.2, feedback: 0.13, wet: 0.15 },
    layers: [
      {
        id: "trial-melody",
        waveform: "triangle",
        volume: 0.056,
        duration: 0.38,
        attack: 0.02,
        notes: score(
          "E4", null, "B4", "G5", "F#5", null, "D5", "B4",
          "C5", null, "G5", "E5", "D5", "F#5", "B5", null,
        ),
      },
      {
        id: "arcane-pulse",
        waveform: "sine",
        volume: 0.027,
        duration: 0.2,
        attack: 0.01,
        notes: score(
          "E3", "B3", "E4", "B3", "D3", "A3", "D4", "A3",
          "C3", "G3", "C4", "G3", "B2", "F#3", "B3", "F#3",
        ),
      },
      {
        id: "pad",
        waveform: "sine",
        volume: 0.016,
        duration: 2.2,
        attack: 0.34,
        strumMs: 24,
        notes: score(
          ["E2", "B2", "E3", "G3"], null, null, null, null, null, null, null,
          ["C3", "G3", "C4", "E4"], null, null, null,
          ["B2", "F#3", "B3", "D4"], null, null, null,
        ),
      },
      {
        id: "heartbeat-bass",
        waveform: "triangle",
        volume: 0.045,
        duration: 0.48,
        attack: 0.018,
        notes: score(
          "E2", null, "E2", null, "D2", null, "D2", null,
          "C2", null, "C2", null, "B1", null, "B2", null,
        ),
      },
    ],
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
