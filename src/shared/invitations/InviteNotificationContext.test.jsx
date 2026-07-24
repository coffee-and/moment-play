// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth;
const fetchFriendOmokInvites = vi.fn();

vi.mock("../auth/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../../infrastructure/supabase/friendOmokInvitesGateway.js", () => ({
  fetchFriendOmokInvites,
}));

const {
  InviteNotificationProvider,
  countActiveIncomingInvites,
  useInviteNotifications,
} = await import("./InviteNotificationContext.jsx");

function Probe() {
  const notifications = useInviteNotifications();
  return (
    <div>
      <span data-count>{notifications.pendingCount}</span>
      <span data-results>{notifications.recentResults.length}</span>
      <span data-refreshing>{String(notifications.isRefreshing)}</span>
      <button type="button" onClick={() => notifications.syncPendingCountFromInvites([
        { inviteId: "incoming-1", direction: "incoming", status: "pending", expiresAt: "2999-01-01T00:00:00Z" },
        { inviteId: "outgoing-1", direction: "outgoing", status: "pending", expiresAt: "2999-01-01T00:00:00Z" },
      ])}>
        sync
      </button>
    </div>
  );
}

async function renderProvider() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <MemoryRouter>
        <InviteNotificationProvider pollIntervalMs={60_000}>
          <Probe />
        </InviteNotificationProvider>
      </MemoryRouter>,
    );
  });
  return {
    host,
    unmount() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

function incomingPending(count) {
  return Array.from({ length: count }, (_, index) => ({
    inviteId: `incoming-${index}`,
    direction: "incoming",
    status: "pending",
    expiresAt: "2999-01-01T00:00:00Z",
  }));
}

beforeEach(() => {
  auth = {
    isConfigured: true,
    status: "guest",
    user: null,
  };
  fetchFriendOmokInvites.mockReset();
  window.localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
});

describe("InviteNotificationProvider", () => {
  it("does not query invitations for signed-out users", async () => {
    const view = await renderProvider();
    expect(fetchFriendOmokInvites).not.toHaveBeenCalled();
    expect(view.host.querySelector("[data-count]").textContent).toBe("0");
    view.unmount();
  });

  it("loads actionable incoming invites and refreshes when the window regains focus", async () => {
    auth = {
      isConfigured: true,
      status: "authenticated",
      user: { id: "user-1" },
    };
    fetchFriendOmokInvites
      .mockResolvedValueOnce(incomingPending(2))
      .mockResolvedValueOnce(incomingPending(4));

    const view = await renderProvider();
    await act(async () => {});
    expect(view.host.querySelector("[data-count]").textContent).toBe("2");

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchFriendOmokInvites).toHaveBeenCalledTimes(2);
    expect(view.host.querySelector("[data-count]").textContent).toBe("4");
    view.unmount();
  });

  it("notifies the sender once when an outgoing invitation is declined", async () => {
    auth = {
      isConfigured: true,
      status: "authenticated",
      user: { id: "user-1" },
    };
    const pending = {
      inviteId: "invite-1",
      direction: "outgoing",
      status: "pending",
      nickname: "후츄",
      expiresAt: "2999-01-01T00:00:00Z",
    };
    const declined = {
      ...pending,
      status: "declined",
      respondedAt: "2026-07-16T11:00:00Z",
    };
    fetchFriendOmokInvites
      .mockResolvedValueOnce([pending])
      .mockResolvedValueOnce([declined])
      .mockResolvedValueOnce([declined]);

    const view = await renderProvider();
    await act(async () => {});

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(view.host.textContent).toContain("후츄님이 오목 초대를 거절했어요.");
    expect(view.host.querySelector("[data-results]").textContent).toBe("1");

    await act(async () => view.host.querySelector('[aria-label="알림 닫기"]').click());
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.host.textContent).not.toContain("후츄님이 오목 초대를 거절했어요.");
    view.unmount();
  });

  it("can synchronize the badge immediately from a loaded inbox", async () => {
    const view = await renderProvider();
    await act(async () => view.host.querySelector("button").click());
    expect(view.host.querySelector("[data-count]").textContent).toBe("1");
    view.unmount();
  });
});

describe("countActiveIncomingInvites", () => {
  it("excludes outgoing, resolved, and expired invitations", () => {
    const now = new Date("2026-07-16T10:00:00Z").getTime();
    expect(countActiveIncomingInvites([
      { direction: "incoming", status: "pending", expiresAt: "2026-07-16T10:10:00Z" },
      { direction: "incoming", status: "accepted", expiresAt: "2026-07-16T10:10:00Z" },
      { direction: "incoming", status: "pending", expiresAt: "2026-07-16T09:50:00Z" },
      { direction: "outgoing", status: "pending", expiresAt: "2026-07-16T10:10:00Z" },
    ], now)).toBe(1);
  });
});
