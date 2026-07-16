// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../shared/theme/ThemeContext.jsx";

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
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="*" element={<LocationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
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
    expect(guestView.host.querySelector('a[href="/login"]')?.textContent).toBe("로그인");
    guestView.unmount();

    auth = { status: "anonymous", user: { id: "anon-1", is_anonymous: true }, signOut };
    const anonymousView = renderLayout();
    expect(anonymousView.host.querySelector('a[href="/login"]')?.textContent).toBe("로그인");
    expect(anonymousView.host.querySelector('a[href="/signup"]')).toBeNull();
    anonymousView.unmount();
  });

  it("shows an authenticated email fallback and never links the account control to login", () => {
    auth = { status: "authenticated", user: { email: "sky.player@example.com", is_anonymous: false }, signOut };
    const view = renderLayout();
    const accountControl = view.host.querySelector(".account-menu summary");
    expect(accountControl.textContent).toBe("sky.player");
    expect(view.host.querySelector('a[href="/login"]')).toBeNull();
    expect(view.host.textContent).not.toContain("로그인");

    act(() => accountControl.click());
    expect(currentPathname).toBe("/");
    expect(view.host.querySelector(".account-menu__panel button").textContent).toBe("로그아웃");
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
    expect(view.host.querySelector('a[href="/login"]')?.textContent).toBe("로그인");
    view.unmount();
  });
});

describe("AppLayout immersive online room", () => {
  it("hides global navigation and account controls inside an Omok room", () => {
    auth = { status: "authenticated", user: { email: "host@example.com" }, signOut };
    const view = renderLayout("/minigames/omok/room/11111111-1111-4111-8111-111111111111");

    expect(view.host.textContent).toContain("Page content");
    expect(view.host.querySelector(".hd")).toBeNull();
    expect(view.host.querySelector(".account-menu")).toBeNull();
    expect(view.host.querySelector('a[href="/settings"]')).toBeNull();
    expect(view.host.querySelector('a[href="/"]')).toBeNull();
    expect(view.host.querySelector(".moment-app--immersive")).not.toBeNull();
    view.unmount();
  });
});
