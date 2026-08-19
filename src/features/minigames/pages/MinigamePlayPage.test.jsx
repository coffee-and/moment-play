// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth = { status: "guest", user: null };
let receivedRoomId;
let mountedGameIds = [];
let currentLocation;
let navigate;
let shouldGameThrow = false;

vi.mock("../../../shared/auth/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../data/minigameCatalog.js", () => ({
  MINIGAMES_PATH: "/minigames",
  MINIGAME_STATUS: { COMING_SOON: "coming-soon" },
  getMinigameById: (gameId) => ({
    guide: { description: `How to play ${gameId}` },
    id: gameId,
    status: "active",
    title: gameId,
  }),
}));
vi.mock("../data/minigameRegistry.js", () => ({
  getMinigameComponent: () => function GameStub({ game, roomId }) {
    if (shouldGameThrow) {
      throw new Error("game render failed");
    }

    React.useEffect(() => {
      mountedGameIds.push(game.id);
    }, [game.id]);
    receivedRoomId = roomId;
    return <div>Game content</div>;
  },
}));

const { MinigamePlayPage } = await import("./MinigamePlayPage.jsx");

function LocationProbe() {
  currentLocation = useLocation();
  navigate = useNavigate();
  return null;
}

function renderPage(path) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const render = () => root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/minigames/:gameId" element={<MinigamePlayPage />} />
          <Route path="/minigames/:gameId/room/:roomId" element={<MinigamePlayPage />} />
          <Route path="/login" element={<div>Login screen</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
  );
  act(() => render());
  return {
    host,
    rerender() {
      act(() => render());
    },
    unmount() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  auth = { status: "guest", user: null };
  receivedRoomId = undefined;
  mountedGameIds = [];
  currentLocation = null;
  navigate = undefined;
  shouldGameThrow = false;
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

  it("requires a new start confirmation before mounting a different game route", () => {
    auth = { status: "authenticated", user: { id: "user-1" } };
    const view = renderPage("/minigames/2048");

    act(() => view.host.querySelector("button").click());
    expect(mountedGameIds).toEqual(["2048"]);

    act(() => navigate("/minigames/memory"));

    expect(view.host.textContent).toContain("게임 시작하기");
    expect(view.host.textContent).not.toContain("Game content");
    expect(mountedGameIds).toEqual(["2048"]);
    view.unmount();
  });

  it("remounts the active game when the authenticated account changes", () => {
    auth = { status: "authenticated", user: { id: "user-1" } };
    const view = renderPage("/minigames/2048");
    act(() => view.host.querySelector("button").click());
    expect(mountedGameIds).toEqual(["2048"]);

    auth = { status: "authenticated", user: { id: "user-2" } };
    view.rerender();

    expect(mountedGameIds).toEqual(["2048", "2048"]);
    view.unmount();
  });

  it("contains a game render failure inside the active game area", () => {
    auth = { status: "authenticated", user: { id: "user-1" } };
    shouldGameThrow = true;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const preventExpectedError = (event) => event.preventDefault();
    window.addEventListener("error", preventExpectedError);
    const view = renderPage("/minigames/2048");

    try {
      act(() => view.host.querySelector("button").click());

      expect(view.host.textContent).toContain("게임을 계속할 수 없어요.");
      expect(view.host.textContent).toContain("게임 다시 불러오기");
      expect(view.host.textContent).toContain("게임 목록으로");
      expect(view.host.textContent).not.toContain("Game content");
    } finally {
      view.unmount();
      window.removeEventListener("error", preventExpectedError);
      consoleError.mockRestore();
    }
  });
});
