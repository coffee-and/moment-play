// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth = { status: "guest", user: null };
let receivedRoomId;
let currentLocation;

vi.mock("../../../shared/auth/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../data/minigameCatalog.js", () => ({
  MINIGAME_STATUS: { COMING_SOON: "coming-soon" },
  getMinigameById: (gameId) => ({
    guide: { description: `How to play ${gameId}` },
    id: gameId,
    status: "active",
    title: gameId,
  }),
}));
vi.mock("../data/minigameRegistry.js", () => ({
  getMinigameComponent: () => function GameStub({ roomId }) {
    receivedRoomId = roomId;
    return <div>Game content</div>;
  },
}));

const { MinigamePlayPage } = await import("./MinigamePlayPage.jsx");

function LocationProbe() {
  currentLocation = useLocation();
  return null;
}

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
          <Route path="/login" element={<div>Login screen</div>} />
        </Routes>
        <LocationProbe />
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
  auth = { status: "guest", user: null };
  receivedRoomId = undefined;
  currentLocation = null;
});

describe("MinigamePlayPage authentication gate", () => {
  it("lets a guest read instructions but never mounts the game", () => {
    const view = renderPage("/minigames/2048");
    expect(view.host.textContent).toContain("How to play 2048");
    expect(view.host.querySelectorAll('a[href^="/login?"]')).toHaveLength(1);
    expect(view.host.querySelector('[role="status"]')).toBeNull();
    expect(view.host.textContent).not.toContain("Game content");
    expect(receivedRoomId).toBeUndefined();
    view.unmount();
  });

  it("sends a guest to login with the internal game path preserved", () => {
    const view = renderPage("/minigames/omok/room/room-1");
    const loginLink = view.host.querySelector("a");

    act(() => loginLink.click());

    expect(view.host.textContent).toContain("Login screen");
    expect(currentLocation.search).toBe(
      "?returnTo=%2Fminigames%2Fomok%2Froom%2Froom-1",
    );
    expect(receivedRoomId).toBeUndefined();
    view.unmount();
  });

  it("does not auto-start after authentication and mounts only after explicit confirmation", () => {
    auth = { status: "authenticated", user: { id: "user-1" } };
    const view = renderPage("/minigames/omok/room/room-1");
    expect(view.host.textContent).toContain("대기실 입장하기");
    expect(view.host.textContent).not.toContain("Game content");

    act(() => view.host.querySelector("button").click());

    expect(view.host.textContent).toContain("Game content");
    expect(receivedRoomId).toBe("room-1");
    view.unmount();
  });

  it("keeps the game unmounted while session restoration is loading", () => {
    auth = { status: "loading", user: null };
    const view = renderPage("/minigames/2048");
    expect(view.host.textContent).toContain("로그인 상태 확인 중");
    expect(receivedRoomId).toBeUndefined();
    view.unmount();
  });
});
