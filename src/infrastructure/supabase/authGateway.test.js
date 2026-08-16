import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentSession,
  signInWithEmail,
  signInWithProvider,
  signUpWithEmail,
} from "./authGateway.js";

function createClient(authOverrides = {}) {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      signInAnonymously: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(async () => ({ error: null })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      ...authOverrides,
    },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authGateway", () => {
  it("creates an email account with PKCE redirect options and never creates an anonymous account", async () => {
    const client = createClient({
      signUp: vi.fn(async () => ({
        data: { session: null, user: { id: "new-user" } },
        error: null,
      })),
    });

    await signUpWithEmail({
      email: "new@example.com",
      password: "secret1",
      emailRedirectTo: "https://moment-play.example/#/auth/callback",
    }, client);

    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret1",
      options: { emailRedirectTo: "https://moment-play.example/#/auth/callback" },
    });
    expect(client.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("treats a legacy anonymous session as no release session", async () => {
    const client = createClient({
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: "legacy-user", is_anonymous: true } } },
        error: null,
      })),
    });
    await expect(getCurrentSession(client)).resolves.toBeNull();
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("resolves an expired persisted session to guest state", async () => {
    const client = createClient({
      getSession: vi.fn(async () => ({
        data: {
          session: {
            expires_at: Math.floor(Date.now() / 1000) - 1,
            user: { id: "expired-user" },
          },
        },
        error: null,
      })),
    });
    await expect(getCurrentSession(client)).resolves.toBeNull();
  });

  it("normalizes invalid credentials without exposing provider-specific handling to pages", async () => {
    const client = createClient({
      signInWithPassword: vi.fn(async () => ({
        data: { session: null, user: null },
        error: { code: "invalid_credentials", message: "" },
      })),
    });
    await expect(signInWithEmail({
      email: "player@example.com",
      password: "wrong",
    }, client)).rejects.toThrow(/올바르지 않습니다/);
  });

  it.each([
    ["google", "VITE_AUTH_GOOGLE_ENABLED", "google"],
  ])("starts %s through the shared OAuth gateway", async (provider, flagName, supabaseProvider) => {
    vi.stubEnv(flagName, "true");
    const client = createClient({
      signInWithOAuth: vi.fn(async () => ({
        data: { provider: supabaseProvider, url: "https://auth.example/authorize" },
        error: null,
      })),
    });

    await expect(signInWithProvider({
      provider,
      redirectTo: "https://moment-play.example/#/auth/callback?returnTo=%2Ffriends",
    }, client)).resolves.toEqual({
      provider,
      redirectUrl: "https://auth.example/authorize",
    });

    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: supabaseProvider,
      options: {
        redirectTo: "https://moment-play.example/#/auth/callback?returnTo=%2Ffriends",
      },
    });
  });

  it("rejects a disabled provider before starting OAuth", async () => {
    vi.stubEnv("VITE_AUTH_GOOGLE_ENABLED", "false");
    const client = createClient();

    await expect(signInWithProvider({
      provider: "google",
      redirectTo: "https://moment-play.example/#/auth/callback",
    }, client)).rejects.toThrow(/아직 사용할 수 없습니다/);
    expect(client.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("normalizes provider cancellation and dashboard configuration failures", async () => {
    vi.stubEnv("VITE_AUTH_GOOGLE_ENABLED", "true");
    const cancelledClient = createClient({
      signInWithOAuth: vi.fn(async () => ({
        data: null,
        error: { code: "access_denied", message: "provider-specific cancellation" },
      })),
    });
    await expect(signInWithProvider({
      provider: "google",
      redirectTo: "https://moment-play.example/#/auth/callback",
    }, cancelledClient)).rejects.toThrow(/취소/);

    const disabledClient = createClient({
      signInWithOAuth: vi.fn(async () => ({
        data: null,
        error: { code: "provider_disabled", message: "server details" },
      })),
    });
    await expect(signInWithProvider({
      provider: "google",
      redirectTo: "https://moment-play.example/#/auth/callback",
    }, disabledClient)).rejects.toThrow(/아직 사용할 수 없습니다/);

    const networkFailureClient = createClient({
      signInWithOAuth: vi.fn(async () => ({
        data: null,
        error: { code: "network_error", message: "private upstream details" },
      })),
    });
    await expect(signInWithProvider({
      provider: "google",
      redirectTo: "https://moment-play.example/#/auth/callback",
    }, networkFailureClient)).rejects.toThrow(/시작하지 못했습니다/);
  });
});
