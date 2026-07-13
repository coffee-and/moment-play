// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "../../../layouts/AppLayout.jsx";
import { ThemeProvider } from "../../../shared/theme/ThemeContext.jsx";
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
    <ThemeProvider>
      <MemoryRouter>
        <Routes>
          {withLayout ? (
            <Route element={<AppLayout />}>
              <Route path="/" element={<MiniGamesPage />} />
            </Route>
          ) : (
            <>
              <Route path="/" element={<MiniGamesPage />} />
              <Route path="/minigames/omok" element={<div>Omok route</div>} />
            </>
          )}
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
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

    expect(view.host.textContent).toContain("전체 게임");
    expect(view.host.textContent).not.toContain("Quick match");
    expect(view.host.textContent).not.toContain("UI 보기");
    expect(view.host.textContent).not.toContain("추후 서버 매칭 자리");
    const omokButton = Array.from(view.host.querySelectorAll("button")).find((button) => button.textContent.includes("오목 시작하기"));
    act(() => omokButton.click());
    expect(view.host.textContent).toContain("Omok route");
    view.unmount();
  });

  it("shows Login for guests and Create Account for anonymous users", () => {
    const guestView = renderPage();
    expect(guestView.host.querySelector('.footer a[href="/login"]')?.textContent).toBe("로그인");
    guestView.unmount();

    auth = { status: "anonymous", user: { id: "anon-1", is_anonymous: true }, signOut };
    const anonymousView = renderPage();
    expect(anonymousView.host.querySelector('.footer a[href="/signup"]')?.textContent).toBe("계정 만들기");
    anonymousView.unmount();
  });

  it("shows the shared profile label without a Login link for authenticated users", () => {
    auth = {
      status: "authenticated",
      user: { email: "annn@example.com", user_metadata: { nickname: "annn" }, is_anonymous: false },
      signOut,
    };
    const view = renderPage();
    const footer = view.host.querySelector(".footer");
    expect(footer.textContent).toContain("annn");
    expect(footer.textContent).not.toContain("로그인");
    expect(footer.querySelector('a[href="/login"]')).toBeNull();
    view.unmount();
  });

  it("keeps the header, mobile tab bar, and footer consistent for an authenticated user", () => {
    auth = {
      status: "authenticated",
      user: { email: "annn@example.com", user_metadata: { nickname: "annn" }, is_anonymous: false },
      signOut,
    };
    const view = renderPage({ withLayout: true });

    for (const selector of [".hd-right", ".tabbar", ".footer"]) {
      const accountSurface = view.host.querySelector(selector);
      expect(accountSurface.textContent).toContain("annn");
      expect(accountSurface.textContent).not.toContain("로그인");
      expect(accountSurface.querySelector('a[href="/login"]')).toBeNull();
    }

    expect(view.host.querySelector(".hd-right .account-menu__panel button")?.textContent).toBe("로그아웃");
    expect(view.host.querySelector(".tabbar .account-menu__panel button")?.textContent).toBe("로그아웃");
    view.unmount();
  });
});
