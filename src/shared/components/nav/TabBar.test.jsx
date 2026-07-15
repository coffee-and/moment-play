// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth;
const signOut = vi.fn(async () => {
  auth = { ...auth, status: "guest", user: null };
});

vi.mock("../../auth/AuthContext.jsx", () => ({ useAuth: () => auth }));

const { TabBar } = await import("./TabBar.jsx");

function renderTabBar(initialPath = "/") {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const render = () => act(() => root.render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TabBar />
    </MemoryRouter>,
  ));
  render();
  return { host, render, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
  auth = { status: "guest", user: null, signOut };
  signOut.mockClear();
});

describe("TabBar account item", () => {
  it("does not flash the guest login item while the initial session is unresolved", () => {
    auth = { status: "loading", user: null, signOut };
    const view = renderTabBar();
    expect(view.host.textContent).not.toContain("로그인");
    expect(view.host.querySelector('[aria-label="계정 확인 중"]')).not.toBeNull();
    view.unmount();
  });

  it("shows 로그인 for guests and navigates to /login", () => {
    auth = { status: "guest", user: null, signOut };
    const view = renderTabBar();
    const link = view.host.querySelector('a[href="/login"]');
    expect(link?.textContent).toContain("로그인");
    view.unmount();
  });

  it("shows 로그인 for anonymous users and navigates to /login", () => {
    auth = { status: "anonymous", user: { id: "anon-1", is_anonymous: true }, signOut };
    const view = renderTabBar();
    const link = view.host.querySelector('a[href="/login"]');
    expect(link?.textContent).toContain("로그인");
    expect(view.host.querySelector('a[href="/signup"]')).toBeNull();
    view.unmount();
  });

  it("never shows 로그인 for an authenticated user and shows the nickname when available", () => {
    auth = {
      status: "authenticated",
      user: { email: "sky.player@example.com", user_metadata: { nickname: "달빛여우" }, is_anonymous: false },
      signOut,
    };
    const view = renderTabBar();
    expect(view.host.textContent).not.toContain("로그인");
    expect(view.host.querySelector('a[href="/login"]')).toBeNull();
    expect(view.host.querySelector(".tabbar-account-menu summary")?.textContent).toContain("달빛여우");
    view.unmount();
  });

  it("falls back to 내 계정 for an authenticated user with no nickname or email", () => {
    auth = { status: "authenticated", user: { email: null, is_anonymous: false }, signOut };
    const view = renderTabBar();
    expect(view.host.querySelector(".tabbar-account-menu summary")?.textContent).toContain("내 계정");
    view.unmount();
  });

  it("does not navigate to /login when the authenticated account action is used, and exposes 로그아웃", () => {
    auth = { status: "authenticated", user: { email: "sky.player@example.com", is_anonymous: false }, signOut };
    const view = renderTabBar();
    const summary = view.host.querySelector(".tabbar-account-menu summary");
    act(() => summary.click());
    expect(view.host.querySelector('a[href="/login"]')).toBeNull();
    expect(view.host.querySelector(".tabbar-account-menu .account-menu__panel button")?.textContent).toBe("로그아웃");
    view.unmount();
  });

  it("calls signOut exactly once and returns the tab bar to guest state", async () => {
    auth = { status: "authenticated", user: { email: "sky.player@example.com", is_anonymous: false }, signOut };
    const view = renderTabBar();
    await act(async () => {
      view.host.querySelector(".tabbar-account-menu .account-menu__panel button").click();
      await Promise.resolve();
    });
    expect(signOut).toHaveBeenCalledTimes(1);
    view.render();
    expect(view.host.querySelector('a[href="/login"]')?.textContent).toContain("로그인");
    view.unmount();
  });

  it("keeps the desktop and mobile account controls consistent for anonymous sessions", () => {
    auth = { status: "anonymous", user: { id: "anon-1", is_anonymous: true }, signOut };
    const view = renderTabBar();
    expect(view.host.querySelector('a[href="/login"]')?.textContent).toContain("로그인");
    view.unmount();
  });
});
