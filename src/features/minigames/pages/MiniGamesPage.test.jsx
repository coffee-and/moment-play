// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "../../../layouts/AppLayout.jsx";
import { HomePage } from "./HomePage.jsx";
import { MiniGamesPage } from "./MiniGamesPage.jsx";

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
    <MemoryRouter initialEntries={["/games"]}>
      <Routes>
        {withLayout ? (
          <Route element={<AppLayout />}>
            <Route path="/games" element={<MiniGamesPage />} />
          </Route>
        ) : (
          <>
            <Route path="/games" element={<MiniGamesPage />} />
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

    expect(view.host.textContent).toContain("모든 게임");
    expect(view.host.textContent).not.toContain("Quick match");
    expect(view.host.textContent).not.toContain("UI 보기");
    expect(view.host.textContent).not.toContain("추후 서버 매칭 자리");
    expect(view.host.querySelector(".gcard.open .gc-play")?.textContent).toContain("Play");
    expect(view.host.querySelector(".gcard.soon .gc-play")).toBeNull();
    const omokButton = view.host.querySelector('[data-game="omok"]');
    expect(omokButton).not.toBeNull();
    act(() => omokButton.click());
    expect(view.host.textContent).toContain("Omok route");
    view.unmount();
  });

  it("shows every available game on the home page while keeping the featured card", () => {
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

    expect(host.querySelector(".featured")).not.toBeNull();
    expect(host.querySelectorAll(".home-games-grid .gcard")).toHaveLength(6);
    expect(host.querySelector('.home-games-grid [data-game="omok"]')).not.toBeNull();
    expect(host.querySelector(".games-catalog")).toBeNull();
    act(() => root.unmount());
  });

  it("filters the catalog by category", () => {
    const view = renderPage();
    const memoryFilter = [...view.host.querySelectorAll(".chipf")].find((button) => button.textContent === "Memory");
    act(() => memoryFilter.click());
    expect(view.host.querySelectorAll(".gcard")).toHaveLength(1);
    expect(view.host.querySelector(".gcard")?.textContent).toContain("순서 맞추기");
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
