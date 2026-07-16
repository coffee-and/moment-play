import { AUDIO_TRACKS } from "./audioCatalog.js";

const FADE_SECONDS = 0.55;
const BGM_DUCK_LEVEL = 0.32;

function getAudioContextConstructor() {
  return globalThis.AudioContext ?? globalThis.webkitAudioContext ?? null;
}

function safeCancel(gain, time) {
  gain.cancelScheduledValues?.(time);
  gain.setValueAtTime(gain.value, time);
}

export class GameAudioEngine {
  constructor({ AudioContextClass = getAudioContextConstructor() } = {}) {
    this.AudioContextClass = AudioContextClass;
    this.context = null;
    this.enabled = true;
    this.ducked = false;
    this.desiredTrack = null;
    this.currentTrack = null;
    this.sfxGain = null;
  }

  get isSupported() {
    return Boolean(this.AudioContextClass);
  }

  get isRunning() {
    return this.context?.state === "running";
  }

  ensureContext() {
    if (!this.isSupported) return null;
    if (!this.context) {
      this.context = new this.AudioContextClass();
      this.sfxGain = this.context.createGain();
      this.sfxGain.gain.value = 0.72;
      this.sfxGain.connect(this.context.destination);
    }
    return this.context;
  }

  async unlock() {
    const context = this.ensureContext();
    if (!context || !this.enabled) return false;
    try {
      if (context.state !== "running") await context.resume();
      if (context.state === "running" && this.desiredTrack) this.startTrack(this.desiredTrack);
      return context.state === "running";
    } catch {
      return false;
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.stopTrack();
      return;
    }
    if (this.isRunning && this.desiredTrack) this.startTrack(this.desiredTrack);
  }

  setTrack(trackKey) {
    this.desiredTrack = AUDIO_TRACKS[trackKey] ? trackKey : null;
    if (!this.enabled || !this.isRunning) return;
    this.startTrack(this.desiredTrack);
  }

  setDucked(ducked) {
    this.ducked = Boolean(ducked);
    const bus = this.currentTrack?.gain;
    if (!bus || !this.context) return;
    const now = this.context.currentTime;
    safeCancel(bus.gain, now);
    bus.gain.linearRampToValueAtTime(this.ducked ? BGM_DUCK_LEVEL : 1, now + 0.18);
  }

  startTrack(trackKey) {
    if (!trackKey || !this.context || !this.enabled || !this.isRunning) return;
    if (this.currentTrack?.key === trackKey) return;

    const previousTrack = this.currentTrack;
    if (previousTrack) this.fadeOutTrack(previousTrack);

    const config = AUDIO_TRACKS[trackKey];
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.ducked ? BGM_DUCK_LEVEL : 1, now + FADE_SECONDS);
    gain.connect(this.context.destination);

    const track = {
      key: trackKey,
      config,
      gain,
      index: 0,
      intervalId: null,
      cleanupTimerId: null,
    };
    this.currentTrack = track;
    this.playTrackStep(track);
    track.intervalId = globalThis.setInterval(() => this.playTrackStep(track), config.stepMs);
  }

  playTrackStep(track) {
    if (this.currentTrack !== track || !this.enabled || !this.isRunning) return;
    const note = track.config.notes[track.index % track.config.notes.length];
    track.index += 1;
    if (!note) return;
    this.playTone({
      destination: track.gain,
      duration: track.config.duration,
      frequency: note,
      type: track.config.waveform,
      volume: track.config.volume,
      attack: 0.12,
    });
  }

  fadeOutTrack(track) {
    if (!this.context) return;
    if (track.intervalId) globalThis.clearInterval(track.intervalId);
    const now = this.context.currentTime;
    safeCancel(track.gain.gain, now);
    track.gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
    track.cleanupTimerId = globalThis.setTimeout(() => {
      track.gain.disconnect();
    }, (FADE_SECONDS + 0.08) * 1000);
  }

  stopTrack() {
    if (!this.currentTrack) return;
    const track = this.currentTrack;
    this.currentTrack = null;
    this.fadeOutTrack(track);
  }

  playTone({
    attack = 0.01,
    destination = this.sfxGain,
    duration = 0.12,
    endFrequency,
    frequency,
    type = "sine",
    volume = 0.09,
  }) {
    if (!this.context || !this.enabled || !this.isRunning || !destination) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  playSound(sound) {
    if (!this.enabled || !this.isRunning) return;
    const sequences = {
      countdown: [[660, 660, 0.08, 0]],
      countdownFinal: [[880, 1174.66, 0.18, 0]],
      correct: [[783.99, 1174.66, 0.13, 0]],
      success: [[659.25, 987.77, 0.2, 0], [987.77, 1318.51, 0.22, 100]],
      clear: [[523.25, 659.25, 0.17, 0], [659.25, 783.99, 0.18, 115], [783.99, 1046.5, 0.26, 230]],
      wrong: [[220, 174.61, 0.18, 0]],
      gameOver: [[329.63, 246.94, 0.2, 0], [246.94, 164.81, 0.3, 150]],
      tap: [[440, 523.25, 0.06, 0]],
      move: [[293.66, 349.23, 0.045, 0]],
    };
    const sequence = sequences[sound];
    if (!sequence) return;
    sequence.forEach(([frequency, endFrequency, duration, delayMs]) => {
      globalThis.setTimeout(() => {
        this.playTone({
          frequency,
          endFrequency,
          duration,
          type: sound === "gameOver" || sound === "wrong" ? "triangle" : "sine",
          volume: sound === "move" ? 0.035 : 0.1,
        });
      }, delayMs);
    });
  }

  async suspend() {
    if (!this.context || this.context.state !== "running") return;
    await this.context.suspend();
  }

  async resume() {
    if (!this.context || !this.enabled || this.context.state === "running") return;
    try {
      await this.context.resume();
    } catch {
      return;
    }
  }

  destroy() {
    this.stopTrack();
    this.context?.close?.();
    this.context = null;
    this.sfxGain = null;
  }
}
