// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let configured = true;

const mockClient = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(async () => ({ error: null })),
    signUp: vi.fn(),
    updateUser: vi.fn(),
  },
};

vi.mock("../../infrastructure/supabase/supabaseClient.js", () => ({
  getSupabaseClient: () => mockClient,
  isSupabaseConfigured: () => configured,
}));

const { AuthProvider, useAuth } = await import("./AuthContext.jsx");

function session(overrides = {}) {
  return { user: { id: "user-1", is_anonymous: false, ...overrides.user } };
}

let latest = null;
function Harness() {
  latest = useAuth();
  return null;
}

async function renderAuth() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<AuthProvider><Harness /></AuthProvider>);
  });
  // Flush the initial getExistingSession().then(...) microtask.
  await act(async () => {});
  return () => act(() => {
    root.unmount();
    host.remove();
  });
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  mockClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockClient.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  configured = true;
  latest = null;
});

describe("AuthProvider / useAuth", () => {
  it("stays guest and rejects auth actions without touching Supabase when not configured", async () => {
    configured = false;
    const unmount = await renderAuth();

    expect(latest.status).toBe("guest");
    expect(latest.isConfigured).toBe(false);
    await expect(latest.signIn({ email: "a@a.com", password: "secret1" })).rejects.toThrow(/설정되지 않아/);
    await expect(latest.signUp({ email: "a@a.com", password: "secret1" })).rejects.toThrow(/설정되지 않아/);
    await expect(latest.signOut()).resolves.toBeUndefined();

    expect(mockClient.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(mockClient.auth.signUp).not.toHaveBeenCalled();
    expect(mockClient.auth.signOut).not.toHaveBeenCalled();
    unmount();
  });

  it("derives guest status from an empty initial session and updates on auth state changes", async () => {
    let authStateCallback;
    mockClient.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const unmount = await renderAuth();
    expect(latest.status).toBe("guest");
    expect(latest.user).toBeNull();

    await act(async () => {
      authStateCallback("SIGNED_IN", session());
    });

    expect(latest.status).toBe("authenticated");
    expect(latest.user.id).toBe("user-1");
    unmount();
  });

  it("derives anonymous status from an existing anonymous session", async () => {
    mockClient.auth.getSession.mockResolvedValueOnce({
      data: { session: session({ user: { is_anonymous: true } }) },
      error: null,
    });

    const unmount = await renderAuth();
    expect(latest.status).toBe("anonymous");
    unmount();
  });

  it("signIn calls signInWithPassword and maps a failure to a friendly message", async () => {
    mockClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: "Invalid login credentials" },
    });

    const unmount = await renderAuth();
    await expect(latest.signIn({ email: "a@a.com", password: "wrong" })).rejects.toThrow("Invalid login credentials");
    expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@a.com", password: "wrong" });
    unmount();
  });

  it("signUp creates a fresh account when there is no existing session", async () => {
    mockClient.auth.signUp.mockResolvedValueOnce({
      data: { session: null, user: { id: "new-user", is_anonymous: false } },
      error: null,
    });

    const unmount = await renderAuth();
    const result = await latest.signUp({ email: "new@a.com", password: "secret1" });

    expect(mockClient.auth.signUp).toHaveBeenCalledWith({ email: "new@a.com", password: "secret1" });
    expect(mockClient.auth.updateUser).not.toHaveBeenCalled();
    expect(result.session).toBeNull();
    unmount();
  });

  it("signUp upgrades an existing anonymous session via updateUser instead of creating a new account", async () => {
    mockClient.auth.getSession.mockResolvedValueOnce({
      data: { session: session({ user: { id: "anon-user", is_anonymous: true } }) },
      error: null,
    });
    mockClient.auth.updateUser.mockResolvedValueOnce({
      data: { user: { id: "anon-user", email: "upgraded@a.com", is_anonymous: false } },
      error: null,
    });

    const unmount = await renderAuth();
    expect(latest.status).toBe("anonymous");

    const result = await latest.signUp({ email: "upgraded@a.com", password: "secret1" });

    expect(mockClient.auth.updateUser).toHaveBeenCalledWith({ email: "upgraded@a.com", password: "secret1" });
    expect(mockClient.auth.signUp).not.toHaveBeenCalled();
    expect(result.user.id).toBe("anon-user");
    expect(result.session).not.toBeNull();
    unmount();
  });

  it("signOut calls the client and surfaces a friendly error on failure", async () => {
    mockClient.auth.signOut.mockResolvedValueOnce({ error: { message: "network down" } });

    const unmount = await renderAuth();
    await expect(latest.signOut()).rejects.toThrow("network down");
    expect(mockClient.auth.signOut).toHaveBeenCalled();
    unmount();
  });
});
