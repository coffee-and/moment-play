// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const completeAuthCallback = vi.fn();
const parseAuthCallback = vi.fn();
const refreshSession = vi.fn(async () => ({ user: { id: "user-1" } }));
let currentLocation;

vi.mock("../../../shared/auth/authCallback.js", () => ({
  completeAuthCallback,
  parseAuthCallback,
}));
vi.mock("../../../shared/auth/AuthContext.jsx", () => ({
  useAuth: () => ({ isConfigured: true, refreshSession }),
}));

const { AuthCallbackPage } = await import("./AuthCallbackPage.jsx");

function LocationProbe() {
  currentLocation = useLocation();
  return null;
}

async function renderPage() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/auth/callback"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/friends" element={<div>Friends screen</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    );
  });
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  parseAuthCallback.mockReturnValue({ returnTo: "/" });
  currentLocation = null;
});

describe("AuthCallbackPage", () => {
  it("restores the session and returns after a successful verification", async () => {
    parseAuthCallback.mockReturnValueOnce({ returnTo: "/friends" });
    completeAuthCallback.mockResolvedValueOnce({
      returnTo: "/friends",
      session: { user: { id: "user-1" } },
    });

    const view = await renderPage();
    await act(async () => {});

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(currentLocation.pathname).toBe("/friends");
    expect(view.host.textContent).toContain("Friends screen");
    view.unmount();
  });

  it("shows a recoverable login action when callback verification fails", async () => {
    parseAuthCallback.mockReturnValueOnce({ returnTo: "/friends" });
    completeAuthCallback.mockRejectedValueOnce(new Error("인증 링크가 만료되었습니다."));

    const view = await renderPage();
    await act(async () => {});

    expect(view.host.querySelector('[role="alert"]').textContent).toMatch(/만료/);
    expect(view.host.querySelector('a[href*="/login"]').getAttribute("href")).toContain(
      "returnTo=%2Ffriends",
    );
    view.unmount();
  });
});
