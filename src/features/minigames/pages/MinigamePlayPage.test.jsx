// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let receivedRoomId = null;

vi.mock("../data/minigameCatalog.js", () => ({
  MINIGAME_STATUS: { COMING_SOON: "coming-soon" },
  getMinigameById: (gameId) => ({ id: gameId, status: "active", title: gameId }),
}));

vi.mock("../data/minigameRegistry.js", () => ({
  getMinigameComponent: () => function GameStub({ roomId }) {
    receivedRoomId = roomId;
    return <div>Game content</div>;
  },
}));

const { MinigamePlayPage } = await import("./MinigamePlayPage.jsx");

function renderPage(path) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/minigames/:gameId" element={<MinigamePlayPage />} />
          <Route path="/minigames/:gameId/room/:roomId" element={<MinigamePlayPage />} />
        </Routes>
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

afterEach(() => {
  document.body.innerHTML = "";
  receivedRoomId = null;
});

describe("MinigamePlayPage exit policy", () => {
  it("keeps the game-list return link for ordinary single-game routes", () => {
    const view = renderPage("/minigames/2048");
    expect(view.host.querySelector('a[href="/"]')?.textContent).toContain("게임 목록으로");
    expect(receivedRoomId).toBeNull();
    view.unmount();
  });

  it("removes the generic return link inside online rooms", () => {
    const view = renderPage("/minigames/omok/room/11111111-1111-4111-8111-111111111111");
    expect(view.host.querySelector('a[href="/"]')).toBeNull();
    expect(receivedRoomId).toBe("11111111-1111-4111-8111-111111111111");
    expect(view.host.textContent).toContain("Game content");
    view.unmount();
  });
});
