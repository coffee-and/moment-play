// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const toggleAudio = vi.fn();
let audio = { showUnlockHint: false, toggleAudio };

vi.mock("./GameAudioContext.jsx", () => ({
  useGameAudio: () => audio,
}));

const { SoundUnlockHint } = await import("./SoundUnlockHint.jsx");

function renderHint() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<SoundUnlockHint />));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
  audio = { showUnlockHint: false, toggleAudio };
  toggleAudio.mockClear();
});

describe("SoundUnlockHint", () => {
  it("stays hidden until audio needs an explicit unlock", () => {
    const view = renderHint();
    expect(view.host.querySelector(".sound-unlock-hint")).toBeNull();
    view.unmount();
  });

  it("uses helper copy and keeps the audio toggle action", () => {
    audio = { showUnlockHint: true, toggleAudio };
    const view = renderHint();
    const hint = view.host.querySelector(".sound-unlock-hint");

    expect(hint.textContent).toBe("스피커를 눌러 음악을 켤 수 있어요.");
    act(() => hint.click());
    expect(toggleAudio).toHaveBeenCalledTimes(1);
    view.unmount();
  });
});
