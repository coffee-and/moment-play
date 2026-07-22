import { describe, expect, it } from "vitest";
import {
  AUDIO_TRACK,
  AUDIO_TRACKS,
  getAudioTrackForPath,
} from "./audioCatalog.js";

function flattenEvents(notes) {
  return notes.flatMap((event) => {
    if (event == null) return [];
    return Array.isArray(event) ? event : [event];
  });
}

describe("audio catalog", () => {
  it("maps home and game routes to distinct background tracks", () => {
    expect(getAudioTrackForPath("/")).toBe(AUDIO_TRACK.HOME);
    expect(getAudioTrackForPath("/minigames/memory")).toBe(AUDIO_TRACK.MEMORY);
    expect(getAudioTrackForPath("/minigames/omok/room/example")).toBe(AUDIO_TRACK.OMOK);
  });

  it("builds every BGM as layered music with harmony, bass, and ambience", () => {
    Object.values(AUDIO_TRACKS).forEach((track) => {
      expect(track.layers.length).toBeGreaterThanOrEqual(4);
      expect(track.echo.wet).toBeGreaterThan(0);
      expect(new Set(track.layers.map((layer) => layer.id)).size).toBe(track.layers.length);

      const events = track.layers.flatMap((layer) => layer.notes);
      const frequencies = track.layers.flatMap((layer) => flattenEvents(layer.notes));
      expect(events.some((event) => Array.isArray(event) && event.length >= 3)).toBe(true);
      expect(frequencies.some((frequency) => frequency < 150)).toBe(true);
      expect(frequencies.every((frequency) => frequency > 20 && frequency < 5000)).toBe(true);
    });
  });

  it("gives the home theme a longer evolving score than the old single melody loop", () => {
    const homeTrack = AUDIO_TRACKS[AUDIO_TRACK.HOME];
    expect(homeTrack.stepMs).toBeLessThanOrEqual(400);
    expect(homeTrack.layers.length).toBe(5);
    expect(homeTrack.layers.every((layer) => layer.notes.length === 32)).toBe(true);
  });

});
