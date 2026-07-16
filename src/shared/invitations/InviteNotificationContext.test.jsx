// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth;
const fetchPendingFriendOmokInviteCount = vi.fn();

vi.mock("../auth/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../../infrastructure/supabase/friendOmokInvitesGateway.js", () => ({
  fetchPendingFriendOmokInviteCount,
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
      <span data-refreshing>{String(notifications.isRefreshing)}</span>
      <button type="button" onClick={() => notifications.syncPendingCountFromInvites([
        { direction: "incoming", status: "pending", expiresAt: "2999-01-01T00:00:00Z" },
        { direction: "outgoing", status: "pending", expiresAt: "2999-01-01T00:00:00Z" },
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
      <InviteNotificationProvider pollIntervalMs={60_000}>
        <Probe />
      </InviteNotificationProvider>,
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

beforeEach(() => {
  auth = {
    isConfigured: true,
    status: "guest",
    user: null,
  };
  fetchPendingFriendOmokInviteCount.mockReset();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("InviteNotificationProvider", () => {
  it("does not query invite counts for signed-out users", async () => {
    const view = await renderProvider();
    expect(fetchPendingFriendOmokInviteCount).not.toHaveBeenCalled();
    expect(view.host.querySelector("[data-count]").textContent).toBe("0");
    view.unmount();
  });

  it("loads the incoming invite count and refreshes when the window regains focus", async () => {
    auth = {
      isConfigured: true,
      status: "authenticated",
      user: { id: "user-1" },
    };
    fetchPendingFriendOmokInviteCount
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4);

    const view = await renderProvider();
    await act(async () => {});
    expect(view.host.querySelector("[data-count]").textContent).toBe("2");

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchPendingFriendOmokInviteCount).toHaveBeenCalledTimes(2);
    expect(view.host.querySelector("[data-count]").textContent).toBe("4");
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
