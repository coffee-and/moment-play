// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../../invitations/InviteNotificationContext.jsx", () => ({
  useInviteNotifications: () => ({ pendingCount: 3 }),
}));
vi.mock("../../auth/AuthContext.jsx", () => ({
  useAuth: () => ({ signOut: vi.fn(), status: "authenticated", user: { email: "player@example.com" } }),
}));

const { PrimaryNav } = await import("./PrimaryNav.jsx");
const { TabBar } = await import("./TabBar.jsx");

function renderComponent(component) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<MemoryRouter>{component}</MemoryRouter>));
  return {
    host,
    unmount() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("invite notification badges", () => {
  it("shows the same accessible count on the desktop Friends navigation", () => {
    const view = renderComponent(<PrimaryNav />);
    const friendsLink = view.host.querySelector('a[href="/friends"]');
    expect(friendsLink.textContent).toContain("Friends");
    expect(friendsLink.getAttribute("aria-label")).toBe("친구, 받은 오목 초대 3개");
    expect(friendsLink.querySelector(".nav-notification-badge").textContent).toBe("3");
    view.unmount();
  });

  it("shows the count next to the mobile Friends icon", () => {
    const view = renderComponent(<TabBar />);
    const friendsLink = view.host.querySelector('a[href="/friends"]');
    expect(friendsLink.getAttribute("aria-label")).toBe("친구, 받은 오목 초대 3개");
    expect(friendsLink.querySelector(".tabbar__icon .nav-notification-badge").textContent).toBe("3");
    view.unmount();
  });
});
