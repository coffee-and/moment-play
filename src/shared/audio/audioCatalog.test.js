import { describe, expect, it, vi } from "vitest";
import {
  AUDIO_PREFERENCE_KEY,
  AUDIO_TRACK,
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

  it("defaults sound to enabled and persists an explicit mute", () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    expect(readAudioPreference(storage)).toBe(true);
    writeAudioPreference(false, storage);
    expect(storage.setItem).toHaveBeenCalledWith(AUDIO_PREFERENCE_KEY, "false");
  });
});
