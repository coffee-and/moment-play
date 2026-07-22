// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const engine = vi.hoisted(() => ({
  destroy: vi.fn(),
  playSound: vi.fn(),
  resume: vi.fn(async () => {}),
  setDucked: vi.fn(),
  setEnabled: vi.fn(),
  setTrack: vi.fn(),
  suspend: vi.fn(async () => {}),
  unlock: vi.fn(async () => true),
}));

vi.mock("./audioEngine.js", () => ({
  GameAudioEngine: class {
    destroy = engine.destroy;
    playSound = engine.playSound;
    resume = engine.resume;
    setDucked = engine.setDucked;
    setEnabled = engine.setEnabled;
    setTrack = engine.setTrack;
    suspend = engine.suspend;
    unlock = engine.unlock;
  },
}));

vi.mock("../feedback/GameFeedbackContext.jsx", () => ({
  useGameFeedback: () => ({ triggerFeedback: vi.fn() }),
}));

import { GameAudioProvider, useGameAudio } from "./GameAudioContext.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function AudioProbe() {
  const audio = useGameAudio();
  return (
    <button type="button" data-enabled={audio.enabled} onClick={() => void audio.toggleAudio()}>
      {audio.isAudible ? "audible" : "muted"}
    </button>
  );
}

function renderProvider() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={["/minigames/memory"]}>
        <GameAudioProvider><AudioProbe /></GameAudioProvider>
      </MemoryRouter>,
    );
  });

  return {
    host,
    unmount() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

describe("GameAudioProvider session defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("starts muted on every provider mount and never persists the toggle", async () => {
    window.localStorage.setItem("moment-play:audio-enabled", "true");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const first = renderProvider();
    const firstToggle = first.host.querySelector("button");

    expect(firstToggle.dataset.enabled).toBe("false");
    expect(firstToggle.textContent).toBe("muted");

    await act(async () => {
      firstToggle.click();
      await Promise.resolve();
    });

    expect(firstToggle.dataset.enabled).toBe("true");
    expect(firstToggle.textContent).toBe("audible");
    expect(setItem).not.toHaveBeenCalled();
    first.unmount();

    const second = renderProvider();
    expect(second.host.querySelector("button").dataset.enabled).toBe("false");
    expect(second.host.querySelector("button").textContent).toBe("muted");
    second.unmount();
  });

  it("suspends audio when the page is hidden by mobile navigation", () => {
    const view = renderProvider();
    act(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
    expect(engine.suspend).toHaveBeenCalledTimes(1);
    view.unmount();
  });
});
