// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthCallbackUrl } from "./authRedirect.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildAuthCallbackUrl", () => {
  it("builds a local HashRouter callback from the Vite base", () => {
    vi.stubEnv("VITE_AUTH_CALLBACK_URL", "");
    vi.stubEnv("BASE_URL", "/");
    expect(buildAuthCallbackUrl("/minigames/2048")).toBe(
      "http://localhost:3000/#/auth/callback?returnTo=%2Fminigames%2F2048",
    );
  });

  it("preserves a deployed base path", () => {
    vi.stubEnv("VITE_AUTH_CALLBACK_URL", "");
    vi.stubEnv("BASE_URL", "/moment-play/");
    expect(buildAuthCallbackUrl("/settings")).toBe(
      "http://localhost:3000/moment-play/#/auth/callback?returnTo=%2Fsettings",
    );
  });

  it("supports an explicitly configured future native deep link", () => {
    vi.stubEnv("VITE_AUTH_CALLBACK_URL", "momentplay://auth/callback");
    expect(buildAuthCallbackUrl("/friends")).toBe(
      "momentplay://auth/callback?returnTo=%2Ffriends",
    );
  });

  it("rejects executable callback schemes", () => {
    vi.stubEnv("VITE_AUTH_CALLBACK_URL", "javascript:alert(1)");
    expect(() => buildAuthCallbackUrl("/")).toThrow(/web or native-app/);
  });
});
