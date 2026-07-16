// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth = { isConfigured: true, status: "guest" };
let currentPathname = "/friends";
const fetchMyFriendProfile = vi.fn();
const fetchFriendOverview = vi.fn();
const findFriendByCode = vi.fn();
const sendFriendRequest = vi.fn();
const respondToFriendRequest = vi.fn();
const cancelFriendRequest = vi.fn();
const removeFriend = vi.fn();
const fetchFriendOmokInvites = vi.fn();
const createFriendOmokInvite = vi.fn();
const respondToFriendOmokInvite = vi.fn();
const cancelFriendOmokInvite = vi.fn();

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
vi.mock("../../infrastructure/supabase/friendOmokInvitesGateway.js", () => ({
  cancelFriendOmokInvite,
  createFriendOmokInvite,
  fetchFriendOmokInvites,
  respondToFriendOmokInvite,
}));

const { FriendsPage } = await import("./FriendsPage.jsx");

function LocationProbe() {
  currentPathname = useLocation().pathname;
  return null;
}

async function renderPage() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(
    <MemoryRouter initialEntries={["/friends"]}>
      <FriendsPage />
      <LocationProbe />
    </MemoryRouter>,
  ));
  return { host, unmount: () => act(() => root.unmount()) };
}

function clickButton(container, label) {
  const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === label);
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

const incomingInvite = {
  inviteId: "invite-incoming",
  direction: "incoming",
  status: "pending",
  friendCode: "BBBBBBBB02",
  nickname: "FriendBeta",
  roomId: "room-incoming",
  gameMode: "standard",
  createdAt: "2026-07-16T00:00:00Z",
  expiresAt: "2026-07-16T00:15:00Z",
  respondedAt: null,
};

const outgoingInvite = {
  inviteId: "invite-outgoing",
  direction: "outgoing",
  status: "pending",
  friendCode: "CCCCCCCC03",
  nickname: "FriendGamma",
  roomId: "room-outgoing",
  gameMode: "free",
  createdAt: "2026-07-16T00:01:00Z",
  expiresAt: "2026-07-16T00:16:00Z",
  respondedAt: null,
};

beforeEach(() => {
  fetchFriendOmokInvites.mockResolvedValue([]);
});

afterEach(() => {
  document.body.innerHTML = "";
  auth = { isConfigured: true, status: "guest" };
  currentPathname = "/friends";
  fetchMyFriendProfile.mockReset();
  fetchFriendOverview.mockReset();
  findFriendByCode.mockReset();
  sendFriendRequest.mockReset();
  respondToFriendRequest.mockReset();
  cancelFriendRequest.mockReset();
  removeFriend.mockReset();
  fetchFriendOmokInvites.mockReset();
  createFriendOmokInvite.mockReset();
  respondToFriendOmokInvite.mockReset();
  cancelFriendOmokInvite.mockReset();
});

describe("FriendsPage", () => {
  it("asks guest users to log in without calling friend APIs", async () => {
    const view = await renderPage();
    expect(view.host.textContent).toContain("로그인하면 친구와 연결할 수 있어요");
    expect(view.host.querySelector('a[href="/login"]')?.textContent).toBe("로그인");
    expect(fetchMyFriendProfile).not.toHaveBeenCalled();
    expect(fetchFriendOverview).not.toHaveBeenCalled();
    expect(fetchFriendOmokInvites).not.toHaveBeenCalled();
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

  it("loads relationships and pending Omok invites", async () => {
    auth = { isConfigured: true, status: "authenticated" };
    fetchMyFriendProfile.mockResolvedValue(profile);
    fetchFriendOverview.mockResolvedValue(overview);
    fetchFriendOmokInvites.mockResolvedValue([incomingInvite, outgoingInvite]);

    const view = await renderPage();
    await act(async () => {});

    expect(view.host.textContent).toContain("AAAAAAAA01");
    expect(view.host.textContent).toContain("FriendBeta");
    expect(view.host.textContent).toContain("FriendGamma");
    expect(view.host.textContent).toContain("FriendDelta");
    expect(view.host.textContent).toContain("받은 오목 초대");
    expect(view.host.textContent).toContain("보낸 오목 초대");
    expect(view.host.textContent).toContain("수락하고 입장");
    expect(view.host.textContent).toContain("대기실 입장");
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

  it("accepts an incoming friend request and reloads the dashboard", async () => {
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

  it("creates an Omok invite from a friend and enters the waiting room", async () => {
    auth = { isConfigured: true, status: "authenticated" };
    fetchMyFriendProfile.mockResolvedValue(profile);
    fetchFriendOverview.mockResolvedValue([overview[0]]);
    createFriendOmokInvite.mockResolvedValue({ inviteId: "invite-new", roomId: "room-new" });

    const view = await renderPage();
    await act(async () => {});
    clickButton(view.host, "오목 초대");

    expect(document.body.textContent).toContain("FriendBeta님에게 오목 초대");
    clickButton(document, "초대 보내고 대기실 입장");
    await act(async () => {});

    expect(createFriendOmokInvite).toHaveBeenCalledWith({
      friendshipId: "friend-1",
      gameMode: "standard",
      guideSettings: {
        explainForbiddenReasons: true,
        showForbiddenPositions: true,
      },
      roomGuideSettings: {
        allowForbiddenPositions: true,
        allowForbiddenReasons: true,
      },
    });
    expect(currentPathname).toBe("/minigames/omok/room/room-new");
    view.unmount();
  });

  it("accepts an incoming Omok invite and navigates to the shared room", async () => {
    auth = { isConfigured: true, status: "authenticated" };
    fetchMyFriendProfile.mockResolvedValue(profile);
    fetchFriendOverview.mockResolvedValue([overview[0]]);
    fetchFriendOmokInvites.mockResolvedValue([incomingInvite]);
    respondToFriendOmokInvite.mockResolvedValue({ ...incomingInvite, status: "accepted" });

    const view = await renderPage();
    await act(async () => {});
    clickButton(view.host, "수락하고 입장");
    await act(async () => {});

    expect(respondToFriendOmokInvite).toHaveBeenCalledWith("invite-incoming", "accept");
    expect(currentPathname).toBe("/minigames/omok/room/room-incoming");
    view.unmount();
  });

  it("declines and cancels pending Omok invites without navigating", async () => {
    auth = { isConfigured: true, status: "authenticated" };
    fetchMyFriendProfile.mockResolvedValue(profile);
    fetchFriendOverview.mockResolvedValue([]);
    fetchFriendOmokInvites
      .mockResolvedValueOnce([incomingInvite, outgoingInvite])
      .mockResolvedValueOnce([outgoingInvite])
      .mockResolvedValueOnce([]);
    respondToFriendOmokInvite.mockResolvedValue({ ...incomingInvite, status: "declined" });
    cancelFriendOmokInvite.mockResolvedValue({ ...outgoingInvite, status: "cancelled" });

    const view = await renderPage();
    await act(async () => {});
    clickButton(view.host, "거절");
    await act(async () => {});
    expect(respondToFriendOmokInvite).toHaveBeenCalledWith("invite-incoming", "decline");

    clickButton(view.host, "초대 취소");
    await act(async () => {});
    expect(cancelFriendOmokInvite).toHaveBeenCalledWith("invite-outgoing");
    expect(currentPathname).toBe("/friends");
    view.unmount();
  });
});
