import { describe, expect, it, vi } from "vitest";
import {
  getCurrentSession,
  signInWithEmail,
  signUpWithEmail,
} from "./authGateway.js";

function createClient(authOverrides = {}) {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      signInAnonymously: vi.fn(),
      signOut: vi.fn(async () => ({ error: null })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      ...authOverrides,
    },
  };
}

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
});
