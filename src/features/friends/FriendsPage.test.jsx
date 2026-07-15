// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth = { isConfigured: true, status: "guest" };
const fetchMyFriendProfile = vi.fn();
const fetchFriendOverview = vi.fn();
const findFriendByCode = vi.fn();
const sendFriendRequest = vi.fn();
const respondToFriendRequest = vi.fn();
const cancelFriendRequest = vi.fn();
const removeFriend = vi.fn();

vi.mock("../../shared/auth/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../../infrastructure/supabase/friendsGateway.js", () => ({
  cancelFriendRequest,
  fetchFriendOverview,
  fetchMyFriendProfile,
  findFriendByCode,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
}));

const { FriendsPage } = await import("./FriendsPage.jsx");

async function renderPage() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<MemoryRouter><FriendsPage /></MemoryRouter>));
  return { host, unmount: () => act(() => root.unmount()) };
}

function clickButton(host, label) {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent === label);
  if (!button) throw new Error(`Button not found: ${label}`);
  act(() => button.click());
}

function changeInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

const profile = { friendCode: "AAAAAAAA01", nickname: "FriendAlpha" };
const overview = [
  {
    friendshipId: "friend-1",
    friendCode: "BBBBBBBB02",
    nickname: "FriendBeta",
    status: "accepted",
    direction: "friend",
    createdAt: "2026-07-15T00:00:00Z",
    respondedAt: "2026-07-15T01:00:00Z",
  },
  {
    friendshipId: "incoming-1",
    friendCode: "CCCCCCCC03",
    nickname: "FriendGamma",
    status: "pending",
    direction: "incoming",
    createdAt: "2026-07-15T02:00:00Z",
    respondedAt: null,
  },
  {
    friendshipId: "outgoing-1",
    friendCode: "DDDDDDDD04",
    nickname: "FriendDelta",
    status: "pending",
    direction: "outgoing",
    createdAt: "2026-07-15T03:00:00Z",
    respondedAt: null,
  },
];

afterEach(() => {
  document.body.innerHTML = "";
  auth = { isConfigured: true, status: "guest" };
  fetchMyFriendProfile.mockReset();
  fetchFriendOverview.mockReset();
  findFriendByCode.mockReset();
  sendFriendRequest.mockReset();
  respondToFriendRequest.mockReset();
  cancelFriendRequest.mockReset();
  removeFriend.mockReset();
});

describe("FriendsPage", () => {
  it("asks guest users to log in without calling friend APIs", async () => {
    const view = await renderPage();
    expect(view.host.textContent).toContain("로그인하면 친구와 연결할 수 있어요");
    expect(view.host.querySelector('a[href="/login"]')?.textContent).toBe("로그인");
    expect(fetchMyFriendProfile).not.toHaveBeenCalled();
    expect(fetchFriendOverview).not.toHaveBeenCalled();
    view.unmount();
  });

  it("asks anonymous users to log in instead of showing only account creation", async () => {
    auth = { isConfigured: true, status: "anonymous" };
    const view = await renderPage();
    expect(view.host.textContent).toContain("로그인하면 친구와 연결할 수 있어요");
    expect(view.host.querySelector('a[href="/login"]')?.textContent).toBe("로그인");
    expect(view.host.querySelector('a[href="/signup"]')).toBeNull();
    expect(fetchMyFriendProfile).not.toHaveBeenCalled();
    view.unmount();
  });

  it("loads the friend code and groups accepted, incoming, and outgoing relationships", async () => {
    auth = { isConfigured: true, status: "authenticated" };
    fetchMyFriendProfile.mockResolvedValue(profile);
    fetchFriendOverview.mockResolvedValue(overview);

    const view = await renderPage();
    await act(async () => {});

    expect(view.host.textContent).toContain("AAAAAAAA01");
    expect(view.host.textContent).toContain("FriendBeta");
    expect(view.host.textContent).toContain("FriendGamma");
    expect(view.host.textContent).toContain("FriendDelta");
    expect(view.host.textContent).toContain("받은 요청");
    expect(view.host.textContent).toContain("보낸 요청");
    expect(view.host.textContent).toContain("친구 목록");
    view.unmount();
  });

  it("normalizes a friend code, searches, and sends a request", async () => {
    auth = { isConfigured: true, status: "authenticated" };
    fetchMyFriendProfile.mockResolvedValue(profile);
    fetchFriendOverview.mockResolvedValue([]);
    findFriendByCode.mockResolvedValue({
      friendCode: "BBBBBBBB02",
      nickname: "FriendBeta",
      relationshipStatus: "none",
    });
    sendFriendRequest.mockResolvedValue({ friendshipId: "request-1" });

    const view = await renderPage();
    await act(async () => {});

    const input = view.host.querySelector("#friend-code-search");
    await act(async () => changeInput(input, "bbbb-bbbb02"));
    clickButton(view.host, "검색");
    await act(async () => {});

    expect(findFriendByCode).toHaveBeenCalledWith("BBBBBBBB02");
    expect(view.host.textContent).toContain("FriendBeta");

    clickButton(view.host, "친구 요청 보내기");
    await act(async () => {});

    expect(sendFriendRequest).toHaveBeenCalledWith("BBBBBBBB02");
    expect(view.host.textContent).toContain("요청을 보냈어요");
    view.unmount();
  });

  it("accepts an incoming request and reloads the overview", async () => {
    auth = { isConfigured: true, status: "authenticated" };
    fetchMyFriendProfile.mockResolvedValue(profile);
    fetchFriendOverview.mockResolvedValueOnce([overview[1]]).mockResolvedValueOnce([]);
    respondToFriendRequest.mockResolvedValue({ friendshipId: "incoming-1" });

    const view = await renderPage();
    await act(async () => {});
    clickButton(view.host, "수락");
    await act(async () => {});

    expect(respondToFriendRequest).toHaveBeenCalledWith("incoming-1", "accept");
    expect(fetchFriendOverview).toHaveBeenCalledTimes(2);
    expect(view.host.textContent).toContain("새로 받은 친구 요청이 없습니다.");
    view.unmount();
  });
});
