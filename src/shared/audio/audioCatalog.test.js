import { describe, expect, it, vi } from "vitest";
import {
  AUDIO_PREFERENCE_KEY,
  AUDIO_TRACK,
  AUDIO_TRACKS,
  getAudioTrackForPath,
  readAudioPreference,
  writeAudioPreference,
} from "./audioCatalog.js";

describe("audio catalog", () => {
  it("maps home and game routes to distinct background tracks", () => {
    expect(getAudioTrackForPath("/")).toBe(AUDIO_TRACK.HOME);
    expect(getAudioTrackForPath("/minigames/memory")).toBe(AUDIO_TRACK.MEMORY);
    expect(getAudioTrackForPath("/minigames/omok/room/example")).toBe(AUDIO_TRACK.OMOK);
  });

  it("keeps the home loop lively and game tracks clearly audible", () => {
    const homeTrack = AUDIO_TRACKS[AUDIO_TRACK.HOME];
    expect(homeTrack.stepMs).toBeLessThanOrEqual(440);
    expect(homeTrack.duration).toBeLessThan(homeTrack.stepMs / 1000);
    expect(homeTrack.notes).toContain(null);

    const gameTracks = Object.entries(AUDIO_TRACKS)
      .filter(([trackKey]) => trackKey !== AUDIO_TRACK.HOME)
      .map(([, track]) => track);
    expect(gameTracks.every((track) => track.volume >= 0.032)).toBe(true);
  });

  it("defaults sound to enabled and persists an explicit mute", () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    expect(readAudioPreference(storage)).toBe(true);
    writeAudioPreference(false, storage);
    expect(storage.setItem).toHaveBeenCalledWith(AUDIO_PREFERENCE_KEY, "false");
  });
});
