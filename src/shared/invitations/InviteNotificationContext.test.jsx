// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let auth;
let latestNotifications;
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
  latestNotifications = notifications;
  return (
    <div>
      <span data-invites>{notifications.invites.length}</span>
      <span data-count>{notifications.pendingCount}</span>
      <span data-results>{notifications.recentResults.length}</span>
      <span data-refreshing>{String(notifications.isRefreshing)}</span>
    </div>
  );
}

async function renderProvider() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const render = () => root.render(
      <MemoryRouter>
        <InviteNotificationProvider pollIntervalMs={60_000}>
          <Probe />
        </InviteNotificationProvider>
      </MemoryRouter>,
    );
  await act(async () => render());
  return {
    host,
    async rerender() {
      await act(async () => render());
    },
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
  latestNotifications = null;
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
    expect(view.host.querySelector("[data-invites]").textContent).toBe("2");
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

  it("coalesces simultaneous snapshot refreshes into the active request", async () => {
    auth = {
      isConfigured: true,
      status: "authenticated",
      user: { id: "user-1" },
    };
    let resolveSnapshot;
    fetchFriendOmokInvites.mockImplementationOnce(() => new Promise((resolve) => {
      resolveSnapshot = resolve;
    }));

    const view = await renderProvider();
    const firstRefresh = latestNotifications.refreshInviteNotifications();
    const secondRefresh = latestNotifications.refreshInviteNotifications();

    expect(fetchFriendOmokInvites).toHaveBeenCalledTimes(1);
    await act(async () => resolveSnapshot(incomingPending(1)));
    await Promise.all([firstRefresh, secondRefresh]);
    expect(view.host.querySelector("[data-invites]").textContent).toBe("1");
    expect(view.host.querySelector("[data-count]").textContent).toBe("1");
    view.unmount();
  });

  it("aborts the active snapshot request when its provider unmounts", async () => {
    auth = {
      isConfigured: true,
      status: "authenticated",
      user: { id: "user-1" },
    };
    let requestSignal;
    fetchFriendOmokInvites.mockImplementationOnce(({ signal }) => {
      requestSignal = signal;
      return new Promise(() => {});
    });

    const view = await renderProvider();
    expect(requestSignal.aborted).toBe(false);
    view.unmount();
    expect(requestSignal.aborted).toBe(true);
  });

  it("does not expose the previous account snapshot while the next account loads", async () => {
    auth = {
      isConfigured: true,
      status: "authenticated",
      user: { id: "user-1" },
    };
    fetchFriendOmokInvites
      .mockResolvedValueOnce(incomingPending(2))
      .mockImplementationOnce(() => new Promise(() => {}));

    const view = await renderProvider();
    await act(async () => {});
    expect(view.host.querySelector("[data-count]").textContent).toBe("2");

    auth = { ...auth, user: { id: "user-2" } };
    await view.rerender();

    expect(fetchFriendOmokInvites).toHaveBeenCalledTimes(2);
    expect(view.host.querySelector("[data-invites]").textContent).toBe("0");
    expect(view.host.querySelector("[data-count]").textContent).toBe("0");
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
