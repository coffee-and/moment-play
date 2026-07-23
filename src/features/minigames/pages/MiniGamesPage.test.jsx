// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "../../../layouts/AppLayout.jsx";
import { HomePage } from "./HomePage.jsx";
import { MiniGamesPage } from "./MiniGamesPage.jsx";
import { MINIGAME_CATALOG, MINIGAMES_PATH, MINIGAME_STATUS } from "../data/minigameCatalog.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = vi.fn();

const signOut = vi.fn();
let auth = { status: "guest", user: null, signOut };

vi.mock("../../../shared/auth/AuthContext.jsx", () => ({ useAuth: () => auth }));

function renderPage({ withLayout = false } = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <MemoryRouter initialEntries={[MINIGAMES_PATH]}>
      <Routes>
        {withLayout ? (
          <Route element={<AppLayout />}>
            <Route path={MINIGAMES_PATH} element={<MiniGamesPage />} />
          </Route>
        ) : (
          <>
            <Route path={MINIGAMES_PATH} element={<MiniGamesPage />} />
            <Route path="/minigames/omok" element={<div>Omok route</div>} />
          </>
        )}
      </Routes>
    </MemoryRouter>,
  ));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
  auth = { status: "guest", user: null, signOut };
  signOut.mockClear();
});

describe("MiniGamesPage", () => {
  it("shows game discovery without development quick-match copy and opens Omok", () => {
    const view = renderPage();

    expect(view.host.textContent).toContain("ALL GAMES");
    expect(view.host.textContent).not.toContain("Quick match");
    expect(view.host.textContent).not.toContain("UI 보기");
    expect(view.host.textContent).not.toContain("추후 서버 매칭 자리");
    expect(view.host.querySelector(".game-search")).toBeNull();
    expect(view.host.querySelector('input[placeholder="게임 이름 검색"]')).toBeNull();
    expect(view.host.querySelector(".gcard.open .gc-play")?.textContent).toContain("PLAY");
    expect(view.host.querySelector(".gcard.soon .gc-play")).toBeNull();
    const omokButton = view.host.querySelector('[data-game="omok"]');
    expect(omokButton).not.toBeNull();
    act(() => omokButton.click());
    expect(view.host.textContent).toContain("Omok route");
    view.unmount();
  });

  it("shows every available game and opens the decorative Featured card", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/minigames/omok" element={<div>Omok route</div>} />
        </Routes>
      </MemoryRouter>,
    ));

    const featured = host.querySelector(".featured");
    expect(featured).not.toBeNull();
    const featuredCats = featured.querySelectorAll(".featured-cat-pattern__cat");
    expect(featuredCats).toHaveLength(3);
    expect([...featuredCats].every((cat) => cat.getAttribute("alt") === "")).toBe(true);
    expect([...featuredCats].every((cat) => cat.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(host.querySelectorAll(".home-games-grid .featured-cat-pattern__cat")).toHaveLength(0);
    expect(host.querySelectorAll(".home-games-grid .gcard")).toHaveLength(
      MINIGAME_CATALOG.filter((game) => game.status === MINIGAME_STATUS.AVAILABLE).length,
    );
    expect(host.querySelector('.home-games-grid [data-game="omok"]')).not.toBeNull();
    expect(host.querySelector(".games-catalog")).toBeNull();
    act(() => featured.click());
    expect(host.textContent).toContain("Omok route");
    act(() => root.unmount());
  });

  it("filters the catalog by category", () => {
    const view = renderPage();
    const memoryFilter = [...view.host.querySelectorAll(".chipf")].find((button) => button.textContent === "Memory");
    act(() => memoryFilter.click());
    expect(view.host.querySelectorAll(".gcard")).toHaveLength(2);
    expect(view.host.textContent).toContain("Memory Sequence");
    expect(view.host.textContent).toContain("Glow Sequence");
    view.unmount();
  });

  it("keeps account access in the header and the five primary destinations in the mobile tab bar", () => {
    auth = {
      status: "authenticated",
      user: { email: "annn@example.com", user_metadata: { nickname: "annn" }, is_anonymous: false },
      signOut,
    };
    const view = renderPage({ withLayout: true });

    expect(view.host.querySelector(".hd-right")?.textContent).toContain("annn");
    expect(view.host.querySelector(".tabbar")?.children).toHaveLength(5);
    expect(view.host.querySelector(".hd-right .account-menu__panel button")?.textContent).toBe("로그아웃");
    expect(view.host.querySelector(".tabbar .account-menu__panel")).toBeNull();
    view.unmount();
  });
});
