// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth = {
  isConfigured: true,
  signOut: vi.fn(),
  status: "guest",
  user: null,
};
let theme = "dark";
const setTheme = vi.fn();
const fetchMyFriendProfile = vi.fn();
const clearMomentPlayLocalData = vi.fn();

vi.mock("../../shared/auth/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../../shared/theme/ThemeContext.jsx", () => ({ useTheme: () => ({ setTheme, theme }) }));
vi.mock("../../infrastructure/supabase/friendsGateway.js", () => ({ fetchMyFriendProfile }));
vi.mock("../../shared/settings/localDataSettings.js", () => ({ clearMomentPlayLocalData }));

const { SettingsPage } = await import("./SettingsPage.jsx");

async function renderPage() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<MemoryRouter><SettingsPage /></MemoryRouter>));
  return { host, unmount: () => act(() => root.unmount()) };
}

function findButton(host, label) {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent.includes(label));
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

afterEach(() => {
  document.body.innerHTML = "";
  auth = {
    isConfigured: true,
    signOut: vi.fn(async () => {}),
    status: "guest",
    user: null,
  };
  theme = "dark";
  setTheme.mockReset();
  fetchMyFriendProfile.mockReset();
  clearMomentPlayLocalData.mockReset();
});

describe("SettingsPage", () => {
  it("shows a login action for users without a permanent account", async () => {
    const view = await renderPage();
    expect(view.host.querySelector('a[href="/login"]')?.textContent).toContain("로그인");
    expect(fetchMyFriendProfile).not.toHaveBeenCalled();
    view.unmount();
  });

  it("changes the selected theme through the shared theme context", async () => {
    const view = await renderPage();
    act(() => findButton(view.host, "라이트").click());
    expect(setTheme).toHaveBeenCalledWith("light");
    view.unmount();
  });

  it("loads account and friend-code details for an authenticated user", async () => {
    auth = {
      isConfigured: true,
      signOut: vi.fn(async () => {}),
      status: "authenticated",
      user: { email: "sky.player@example.com", user_metadata: { nickname: "달빛여우" } },
    };
    fetchMyFriendProfile.mockResolvedValue({ friendCode: "AAAAAAAA01", nickname: "달빛여우" });

    const view = await renderPage();
    await act(async () => {});

    expect(view.host.textContent).toContain("달빛여우");
    expect(view.host.textContent).toContain("sky.player@example.com");
    expect(view.host.textContent).toContain("AAAAAAAA01");
    expect(view.host.querySelector('a[href="/friends"]')).not.toBeNull();
    view.unmount();
  });

  it("uses the shared logout action", async () => {
    const signOut = vi.fn(async () => {});
    auth = {
      isConfigured: true,
      signOut,
      status: "authenticated",
      user: { email: "sky.player@example.com" },
    };
    fetchMyFriendProfile.mockResolvedValue({ friendCode: "AAAAAAAA01", nickname: "Sky" });

    const view = await renderPage();
    await act(async () => {});
    await act(async () => findButton(view.host, "로그아웃").click());

    expect(signOut).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("requires confirmation before clearing local play data", async () => {
    clearMomentPlayLocalData.mockReturnValue(3);
    const view = await renderPage();

    act(() => findButton(view.host, "게임 기록 초기화").click());
    expect(clearMomentPlayLocalData).not.toHaveBeenCalled();

    act(() => findButton(view.host, "초기화").click());
    expect(clearMomentPlayLocalData).toHaveBeenCalledTimes(1);
    expect(view.host.textContent).toContain("게임 기록과 임시 플레이 데이터를 초기화했어요");
    view.unmount();
  });
});
