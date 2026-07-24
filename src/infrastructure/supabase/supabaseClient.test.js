import { describe, expect, it, vi } from "vitest";

describe("supabaseClient configuration", () => {
  it("does not crash when Supabase environment variables are missing", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");

    const { getSupabaseConfigStatus, isSupabaseConfigured } = await import("./supabaseClient.js");

    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabaseConfigStatus()).toEqual({
      isConfigured: false,
      missingPublishableKey: true,
      missingUrl: true,
    });

    vi.unstubAllEnvs();
  });
});
