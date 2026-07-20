// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOGIN_PATH, SIGNUP_PATH } from "../shared/auth/authConstants.js";
import { SETTINGS_PATH } from "../features/settings/settingsConstants.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = vi.fn();

let auth;
let currentPathname = "/";
const signOut = vi.fn(async () => {
  auth = { ...auth, status: "guest", user: null };
});

vi.mock("../shared/auth/AuthContext.jsx", () => ({ useAuth: () => auth }));

const { AppLayout } = await import("./AppLayout.jsx");

function LocationProbe() {
  currentPathname = useLocation().pathname;
  return <div>Page content</div>;
}

function renderLayout(initialPath = "/") {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const render = () => act(() => root.render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="*" element={<LocationProbe />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  ));
  render();
  return { host, render, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
  auth = { status: "guest", user: null, signOut };
  currentPathname = "/";
  signOut.mockClear();
});

describe("AppLayout account control", () => {
  it("does not flash the guest login action while the initial session is unresolved", () => {
    auth = { status: "loading", user: null, signOut };
    const view = renderLayout();
    expect(view.host.textContent).not.toContain("로그인");
    expect(view.host.querySelector('[aria-label="계정 확인 중"]')).not.toBeNull();
    view.unmount();
  });

  it("shows login for both guest and anonymous sessions", () => {
    auth = { status: "guest", user: null, signOut };
    const guestView = renderLayout();
    expect(guestView.host.querySelector(`a[href="${LOGIN_PATH}"]`)?.textContent).toBe("로그인");
    guestView.unmount();

    auth = { status: "anonymous", user: { id: "anon-1", is_anonymous: true }, signOut };
    const anonymousView = renderLayout();
    expect(anonymousView.host.querySelector(`a[href="${LOGIN_PATH}"]`)?.textContent).toBe("로그인");
    expect(anonymousView.host.querySelector(`a[href="${SIGNUP_PATH}"]`)).toBeNull();
    anonymousView.unmount();
  });

  it("shows an authenticated email fallback and never links the account control to login", () => {
    auth = { status: "authenticated", user: { email: "sky.player@example.com", is_anonymous: false }, signOut };
    const view = renderLayout();
    const accountControl = view.host.querySelector(".account-menu summary");
    expect(accountControl.textContent).toBe("sky.player");
    expect(accountControl.querySelector(".account-control__label")?.textContent).toBe("sky.player");
    expect(view.host.querySelector(`a[href="${LOGIN_PATH}"]`)).toBeNull();
    expect(view.host.textContent).not.toContain("로그인");

    act(() => accountControl.click());
    expect(currentPathname).toBe("/");
    expect(view.host.querySelector(".account-menu__panel button").textContent).toBe("로그아웃");
    view.unmount();
  });

  it("keeps a long authenticated nickname inside the shared account label", () => {
    auth = {
      status: "authenticated",
      user: { email: "player@example.com", is_anonymous: false, user_metadata: { nickname: "아주긴닉네임테스트사용자" } },
      signOut,
    };
    const view = renderLayout();
    const accountControl = view.host.querySelector(".account-menu summary");

    expect(accountControl.querySelector(".account-control__label")?.textContent).toBe("아주긴닉네임테스트사용자");
    expect(accountControl.textContent).toBe("아주긴닉네임테스트사용자");
    view.unmount();
  });

  it("uses an explicit logout action and returns the header to guest state", async () => {
    auth = { status: "authenticated", user: { email: null, is_anonymous: false }, signOut };
    const view = renderLayout();
    expect(view.host.querySelector(".account-menu summary").textContent).toBe("내 계정");

    await act(async () => {
      view.host.querySelector(".account-menu__panel button").click();
      await Promise.resolve();
    });
    expect(signOut).toHaveBeenCalledTimes(1);
    view.render();
    expect(view.host.querySelector(`a[href="${LOGIN_PATH}"]`)?.textContent).toBe("로그인");
    view.unmount();
  });
});

describe("AppLayout immersive game routes", () => {
  it.each([
    "/minigames/2048",
    "/minigames/memory",
    "/minigames/omok",
    "/minigames/omok/room/11111111-1111-4111-8111-111111111111",
  ])("hides global navigation on %s", (path) => {
    auth = { status: "authenticated", user: { email: "host@example.com" }, signOut };
    const view = renderLayout(path);

    expect(view.host.textContent).toContain("Page content");
    expect(view.host.querySelector(".hd")).toBeNull();
    expect(view.host.querySelector(".account-menu")).toBeNull();
    expect(view.host.querySelector(`a[href="${SETTINGS_PATH}"]`)).toBeNull();
    expect(view.host.querySelector(".app-footer")).toBeNull();
    expect(view.host.querySelector(".moment-app--immersive")).not.toBeNull();
    view.unmount();
  });

  it("keeps global navigation on non-game settings pages", () => {
    const view = renderLayout(SETTINGS_PATH);
    expect(view.host.querySelector(".hd")).not.toBeNull();
    expect(view.host.querySelector(".app-footer .footer")).not.toBeNull();
    expect(view.host.querySelector(".moment-app--immersive")).toBeNull();
    view.unmount();
  });
});

describe("AppLayout brand and primary navigation", () => {
  it("renders the exact wordmark and primary destinations in order", () => {
    auth = { status: "guest", user: null, signOut };
    const view = renderLayout("/");
    const headerBrand = view.host.querySelector(".hd .brand");
    const wordmark = headerBrand.querySelector(".brand-wordmark");
    const navLinks = [...view.host.querySelectorAll(".nav .lk")];
    const navItems = [...view.host.querySelectorAll(".nav .primary-nav__item")];

    expect(headerBrand?.textContent).toBe("moment Play");
    expect(headerBrand?.getAttribute("aria-label")).toBe("Moment Play 홈으로");
    expect([...wordmark.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue === " ")).toBe(true);
    expect(navLinks.map((link) => link.textContent)).toEqual([
      "Home",
      "Game",
      "Ranking",
      "Friends",
      "Settings",
    ]);
    expect(navItems).toHaveLength(5);
    expect(navItems.map((item) => item.querySelector(".primary-nav__label")?.textContent)).toEqual([
      "Home",
      "Game",
      "Ranking",
      "Friends",
      "Settings",
    ]);
    expect(navLinks[0].getAttribute("aria-current")).toBe("page");
    expect(navLinks.slice(1).every((link) => !link.hasAttribute("aria-current"))).toBe(true);
    view.unmount();
  });
});
