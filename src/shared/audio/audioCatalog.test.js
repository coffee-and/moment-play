import { describe, expect, it } from "vitest";
import {
  AUDIO_TRACK,
  getAudioTrackForPath,
} from "./audioCatalog.js";

describe("audio catalog", () => {
  it("maps home and game routes to distinct background tracks", () => {
    expect(getAudioTrackForPath("/")).toBe(AUDIO_TRACK.HOME);
    expect(getAudioTrackForPath("/minigames/memory")).toBe(AUDIO_TRACK.MEMORY);
    expect(getAudioTrackForPath("/minigames/omok/room/example")).toBe(AUDIO_TRACK.OMOK);
  });
});
