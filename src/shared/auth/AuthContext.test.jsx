// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let configured = true;

const mockClient = {
  auth: {
    exchangeCodeForSession: vi.fn(),
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
  window.localStorage.clear();
  window.sessionStorage.clear();
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

  it("signUp refuses to run against an anonymous session instead of abandoning it", async () => {
    mockClient.auth.getSession.mockResolvedValueOnce({
      data: { session: session({ user: { id: "anon-user", is_anonymous: true } }) },
      error: null,
    });

    const unmount = await renderAuth();
    expect(latest.status).toBe("anonymous");

    await expect(latest.signUp({ email: "upgraded@a.com", password: "secret1" })).rejects.toThrow(/게스트로 플레이/);
    expect(mockClient.auth.signUp).not.toHaveBeenCalled();
    expect(mockClient.auth.updateUser).not.toHaveBeenCalled();
    unmount();
  });

  it("signUp maps an already-registered email to a clear conflict message", async () => {
    mockClient.auth.signUp.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: "User already registered" },
    });

    const unmount = await renderAuth();
    await expect(latest.signUp({ email: "taken@a.com", password: "secret1" })).rejects.toThrow(/이미 가입된 이메일/);
    unmount();
  });

  it("signOut calls the client and surfaces a friendly error on failure", async () => {
    mockClient.auth.signOut.mockResolvedValueOnce({ error: { message: "network down" } });

    const unmount = await renderAuth();
    await expect(latest.signOut()).rejects.toThrow("network down");
    expect(mockClient.auth.signOut).toHaveBeenCalled();
    unmount();
  });

  describe("anonymous -> permanent upgrade (two-step)", () => {
    it("linkEmail attaches only the email to an anonymous user, never a password", async () => {
      mockClient.auth.getSession.mockResolvedValueOnce({
        data: { session: session({ user: { id: "anon-user", is_anonymous: true } }) },
        error: null,
      });
      mockClient.auth.updateUser.mockResolvedValueOnce({
        data: { user: { id: "anon-user", email: "new@a.com", is_anonymous: true } },
        error: null,
      });

      const unmount = await renderAuth();
      expect(latest.status).toBe("anonymous");

      await latest.linkEmail({ email: "new@a.com" });

      expect(mockClient.auth.updateUser).toHaveBeenCalledTimes(1);
      const [attributes] = mockClient.auth.updateUser.mock.calls[0];
      expect(attributes).toEqual({ email: "new@a.com" });
      expect(attributes.password).toBeUndefined();
      unmount();
    });

    it("linkEmail refuses to run for a non-anonymous session", async () => {
      const unmount = await renderAuth(); // guest, no session
      await expect(latest.linkEmail({ email: "new@a.com" })).rejects.toThrow(/게스트로 플레이 중인 계정/);
      expect(mockClient.auth.updateUser).not.toHaveBeenCalled();
      unmount();
    });

    it("linkEmail maps an already-registered email to a clear conflict message instead of claiming a merge", async () => {
      mockClient.auth.getSession.mockResolvedValueOnce({
        data: { session: session({ user: { id: "anon-user", is_anonymous: true } }) },
        error: null,
      });
      mockClient.auth.updateUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "A user with this email address has already been registered" },
      });

      const unmount = await renderAuth();
      await expect(latest.linkEmail({ email: "taken@a.com" })).rejects.toThrow(/이미 가입된 이메일/);
      unmount();
    });

    it("completeAccountUpgrade refuses to set a password before the email is verified", async () => {
      mockClient.auth.getSession.mockResolvedValueOnce({
        data: { session: session({ user: { id: "anon-user", is_anonymous: true } }) },
        error: null,
      });

      const unmount = await renderAuth();
      expect(latest.status).toBe("anonymous");

      await expect(latest.completeAccountUpgrade({ password: "secret1" })).rejects.toThrow(/인증이 아직 완료되지 않았습니다/);
      expect(mockClient.auth.updateUser).not.toHaveBeenCalled();
      unmount();
    });

    it("completeEmailVerification exchanges the code, and completeAccountUpgrade then sets the password with the same user_id preserved", async () => {
      mockClient.auth.getSession.mockResolvedValueOnce({
        data: { session: session({ user: { id: "anon-user", is_anonymous: true } }) },
        error: null,
      });

      let authStateCallback;
      mockClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      mockClient.auth.exchangeCodeForSession.mockImplementationOnce(async () => {
        // A real exchange fires onAuthStateChange with the now-verified
        // session before resolving - simulate that ordering here.
        authStateCallback("SIGNED_IN", session({ user: { id: "anon-user", is_anonymous: false } }));
        return { data: { session: session({ user: { id: "anon-user", is_anonymous: false } }) }, error: null };
      });

      const unmount = await renderAuth();
      expect(latest.status).toBe("anonymous");

      await act(async () => {
        await latest.completeEmailVerification("the-code");
      });
      expect(mockClient.auth.exchangeCodeForSession).toHaveBeenCalledWith("the-code");
      expect(latest.status).toBe("authenticated");

      mockClient.auth.updateUser.mockResolvedValueOnce({
        data: { user: { id: "anon-user", email: "new@a.com", is_anonymous: false } },
        error: null,
      });

      const result = await latest.completeAccountUpgrade({ password: "secret1" });
      expect(mockClient.auth.updateUser).toHaveBeenCalledWith({ password: "secret1" });
      expect(result.user.id).toBe("anon-user");
      unmount();
    });

    it("never persists a plaintext password to localStorage or sessionStorage", async () => {
      mockClient.auth.getSession.mockResolvedValueOnce({
        data: { session: session({ user: { id: "anon-user", is_anonymous: false } }) },
        error: null,
      });
      mockClient.auth.updateUser.mockResolvedValueOnce({
        data: { user: { id: "anon-user", is_anonymous: false } },
        error: null,
      });

      const unmount = await renderAuth();
      await latest.completeAccountUpgrade({ password: "super-secret-password" });

      const dump = (storage) => Object.keys(storage).map((key) => storage.getItem(key)).join("\n");
      expect(dump(window.localStorage)).not.toContain("super-secret-password");
      expect(dump(window.sessionStorage)).not.toContain("super-secret-password");
      unmount();
    });
  });
});
