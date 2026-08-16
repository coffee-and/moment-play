import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAuthProvider,
  getEnabledAuthProviders,
  isAuthProviderEnabled,
} from "./authProviders.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("auth provider configuration", () => {
  it("keeps every provider disabled until its public deployment flag is explicitly enabled", () => {
    vi.stubEnv("VITE_AUTH_GOOGLE_ENABLED", "false");

    expect(getEnabledAuthProviders()).toEqual([]);
    expect(isAuthProviderEnabled("google")).toBe(false);
  });

  it("maps app provider identifiers to the supported Supabase providers", () => {
    expect(getAuthProvider("google").supabaseProvider).toBe("google");
    expect(getAuthProvider("unknown")).toBeNull();
  });

  it("exposes only explicitly enabled providers", () => {
    vi.stubEnv("VITE_AUTH_GOOGLE_ENABLED", " TRUE ");

    expect(getEnabledAuthProviders()).toEqual(["google"]);
  });
});
