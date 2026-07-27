// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let configured = true;
let authStateCallback = null;
const unsubscribe = vi.fn();
const gateway = {
  getCurrentSession: vi.fn(async () => null),
  signInWithEmail: vi.fn(),
  signInWithProvider: vi.fn(),
  signOutCurrentSession: vi.fn(async () => {}),
  signUpWithEmail: vi.fn(),
  subscribeToAuthChanges: vi.fn((callback) => {
    authStateCallback = callback;
    return unsubscribe;
  }),
};

vi.mock("../../infrastructure/supabase/authGateway.js", () => gateway);
vi.mock("../../infrastructure/supabase/supabaseClient.js", () => ({
  isSupabaseConfigured: () => configured,
}));

const { AuthProvider, useAuth } = await import("./AuthContext.jsx");

function session(user = { id: "user-1", email: "player@example.com" }) {
  return { access_token: "token", user };
}

let latest = null;
function Harness() {
  latest = useAuth();
  return null;
}

async function renderAuth({ flush = true } = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<AuthProvider><Harness /></AuthProvider>);
  });
  if (flush) await act(async () => {});
  return () => act(() => {
    root.unmount();
    host.remove();
  });
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  gateway.getCurrentSession.mockResolvedValue(null);
  gateway.signOutCurrentSession.mockResolvedValue(undefined);
  gateway.subscribeToAuthChanges.mockImplementation((callback) => {
    authStateCallback = callback;
    return unsubscribe;
  });
  authStateCallback = null;
  configured = true;
  latest = null;
});

describe("AuthProvider", () => {
  it("stays guest and rejects configured auth actions without calling a gateway", async () => {
    configured = false;
    const unmount = await renderAuth();

    expect(latest.status).toBe("guest");
    expect(latest.isConfigured).toBe(false);
    await expect(latest.signIn({ email: "a@example.com", password: "secret1" })).rejects.toThrow(/설정되지 않아/);
    await expect(latest.signUp({ email: "a@example.com", password: "secret1" })).rejects.toThrow(/설정되지 않아/);
    await expect(latest.signInWithProvider("google")).rejects.toThrow(/설정되지 않아/);
    await expect(latest.signOut()).resolves.toBeUndefined();
    expect(gateway.signInWithEmail).not.toHaveBeenCalled();
    expect(gateway.signInWithProvider).not.toHaveBeenCalled();
    expect(gateway.signUpWithEmail).not.toHaveBeenCalled();
    unmount();
  });

  it("exposes loading until the existing session resolves, then restores it", async () => {
    let resolveSession;
    gateway.getCurrentSession.mockReturnValue(new Promise((resolve) => {
      resolveSession = resolve;
    }));

    const unmount = await renderAuth({ flush: false });
    expect(latest.status).toBe("loading");

    await act(async () => resolveSession(session()));
    expect(latest.status).toBe("authenticated");
    expect(latest.user.email).toBe("player@example.com");
    unmount();
  });

  it("recovers from initialization failure as guest instead of staying loading", async () => {
    gateway.getCurrentSession.mockRejectedValueOnce(new Error("storage unavailable"));
    const unmount = await renderAuth();
    expect(latest.status).toBe("guest");
    expect(latest.user).toBeNull();
    unmount();
  });

  it("tracks sign-in, token refresh, expiration, and sign-out events", async () => {
    const unmount = await renderAuth();
    expect(latest.status).toBe("guest");

    await act(async () => authStateCallback("SIGNED_IN", session()));
    expect(latest.status).toBe("authenticated");

    await act(async () => authStateCallback("TOKEN_REFRESHED", session({ id: "user-1", email: "fresh@example.com" })));
    expect(latest.user.email).toBe("fresh@example.com");

    await act(async () => authStateCallback("SIGNED_OUT", null));
    expect(latest.status).toBe("guest");
    expect(latest.user).toBeNull();
    unmount();
  });

  it("applies a successful password login immediately", async () => {
    gateway.signInWithEmail.mockResolvedValueOnce({ session: session(), user: session().user });
    const unmount = await renderAuth();

    await act(async () => latest.signIn({ email: "player@example.com", password: "secret1" }));

    expect(gateway.signInWithEmail).toHaveBeenCalledWith({
      email: "player@example.com",
      password: "secret1",
    });
    expect(latest.status).toBe("authenticated");
    unmount();
  });

  it("passes a shared PKCE callback URL and return path to email signup", async () => {
    gateway.signUpWithEmail.mockResolvedValueOnce({ session: null, user: { id: "new-user" } });
    const unmount = await renderAuth();

    await act(async () => latest.signUp({
      email: "new@example.com",
      password: "secret1",
      returnTo: "/minigames/omok",
    }));

    expect(gateway.signUpWithEmail).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret1",
      emailRedirectTo: expect.stringMatching(/#\/auth\/callback\?returnTo=%2Fminigames%2Fomok$/),
    });
    expect(latest.status).toBe("guest");
    unmount();
  });

  it("starts an enabled social provider with the shared safe callback URL", async () => {
    vi.stubEnv("VITE_AUTH_GOOGLE_ENABLED", "true");
    gateway.signInWithProvider.mockResolvedValueOnce({
      provider: "google",
      redirectUrl: "https://auth.example/authorize",
    });
    const unmount = await renderAuth();

    expect(latest.providers).toEqual(["google"]);
    await act(async () => latest.signInWithProvider("google", {
      returnTo: "/minigames/omok",
    }));

    expect(gateway.signInWithProvider).toHaveBeenCalledWith({
      provider: "google",
      redirectTo: expect.stringMatching(/#\/auth\/callback\?returnTo=%2Fminigames%2Fomok$/),
    });
    expect(latest.status).toBe("guest");
    unmount();
  });

  it("keeps the authenticated session when logout fails and clears it after retry succeeds", async () => {
    gateway.getCurrentSession.mockResolvedValueOnce(session());
    gateway.signOutCurrentSession.mockRejectedValueOnce(new Error("network down"));
    const unmount = await renderAuth();

    await expect(act(async () => latest.signOut())).rejects.toThrow("network down");
    expect(latest.status).toBe("authenticated");

    await act(async () => latest.signOut());
    expect(latest.status).toBe("guest");
    unmount();
  });

  it("does not let a late initial guest read overwrite a completed login", async () => {
    let resolveInitial;
    gateway.getCurrentSession.mockReturnValueOnce(new Promise((resolve) => {
      resolveInitial = resolve;
    }));
    gateway.signInWithEmail.mockResolvedValueOnce({ session: session(), user: session().user });
    const unmount = await renderAuth({ flush: false });

    await act(async () => latest.signIn({ email: "player@example.com", password: "secret1" }));
    await act(async () => resolveInitial(null));

    expect(latest.status).toBe("authenticated");
    unmount();
  });

  it("unsubscribes from auth changes on unmount", async () => {
    const unmount = await renderAuth();
    await unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
