// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOGIN_PATH } from "../../shared/auth/authConstants.js";
import { FRIENDS_PATH } from "../friends/friendsConstants.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth = {
  isConfigured: true,
  refreshSession: vi.fn(),
  signOut: vi.fn(),
  status: "guest",
  user: null,
};
const fetchMyFriendProfile = vi.fn();
const saveCurrentProfileNickname = vi.fn();
const clearMomentPlayLocalData = vi.fn();

vi.mock("../../shared/auth/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../../infrastructure/supabase/friendsGateway.js", () => ({ fetchMyFriendProfile }));
vi.mock("../../infrastructure/supabase/omokOnlineRoomGateway.js", () => ({ saveCurrentProfileNickname }));
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

function changeInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = "";
  auth = {
    isConfigured: true,
    refreshSession: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    status: "guest",
    user: null,
  };
  fetchMyFriendProfile.mockReset();
  saveCurrentProfileNickname.mockReset();
  clearMomentPlayLocalData.mockReset();
});

describe("SettingsPage", () => {
  it("shows a login action for users without a permanent account", async () => {
    const view = await renderPage();
    expect(view.host.querySelector(`a[href="${LOGIN_PATH}"]`)?.textContent).toContain("로그인");
    expect(fetchMyFriendProfile).not.toHaveBeenCalled();
    view.unmount();
  });

  it("loads account and friend-code details for an authenticated user", async () => {
    auth = {
      isConfigured: true,
      refreshSession: vi.fn(async () => {}),
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
    expect(view.host.querySelector("#account-nickname")?.value).toBe("달빛여우");
    expect(view.host.querySelector(`a[href="${FRIENDS_PATH}"]`)).not.toBeNull();
    view.unmount();
  });

  it("saves one account nickname and refreshes the auth session label", async () => {
    const refreshSession = vi.fn(async () => {});
    auth = {
      isConfigured: true,
      refreshSession,
      signOut: vi.fn(async () => {}),
      status: "authenticated",
      user: { email: "sky.player@example.com", user_metadata: { nickname: "후츄" } },
    };
    fetchMyFriendProfile.mockResolvedValue({ friendCode: "AAAAAAAA01", nickname: "후츄" });
    saveCurrentProfileNickname.mockResolvedValue({
      userId: "user-1",
      nickname: "바비",
      needsNicknameSetup: false,
    });

    const view = await renderPage();
    await act(async () => {});
    await act(async () => changeInput(view.host.querySelector("#account-nickname"), "바비"));
    await act(async () => findButton(view.host, "저장").click());

    expect(saveCurrentProfileNickname).toHaveBeenCalledWith("바비");
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(view.host.textContent).toContain("닉네임을 변경했어요");
    expect(view.host.querySelector("#account-nickname").value).toBe("바비");
    view.unmount();
  });

  it("shows nickname validation failures as alerts", async () => {
    auth = {
      isConfigured: true,
      refreshSession: vi.fn(async () => {}),
      signOut: vi.fn(async () => {}),
      status: "authenticated",
      user: { email: "sky.player@example.com" },
    };
    fetchMyFriendProfile.mockResolvedValue({ friendCode: "AAAAAAAA01", nickname: "Sky" });
    saveCurrentProfileNickname.mockRejectedValue(new Error("닉네임은 2자 이상 입력해 주세요."));

    const view = await renderPage();
    await act(async () => {});
    await act(async () => changeInput(view.host.querySelector("#account-nickname"), "a"));
    await act(async () => findButton(view.host, "저장").click());

    expect(view.host.querySelector('[role="alert"]')?.textContent).toContain("2자 이상");
    view.unmount();
  });

  it("uses the shared logout action", async () => {
    const signOut = vi.fn(async () => {});
    auth = {
      isConfigured: true,
      refreshSession: vi.fn(async () => {}),
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
