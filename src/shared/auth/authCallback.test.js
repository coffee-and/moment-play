// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const exchangeAuthCode = vi.fn();
vi.mock("../../infrastructure/supabase/authGateway.js", () => ({ exchangeAuthCode }));

const {
  completeAuthCallback,
  parseAuthCallback,
  resetConsumedAuthCodesForTests,
} = await import("./authCallback.js");

afterEach(() => {
  vi.clearAllMocks();
  resetConsumedAuthCodesForTests();
  window.history.replaceState(null, "", "/");
});

describe("auth callback parsing and exchange", () => {
  it("reads Supabase PKCE code before a HashRouter fragment", () => {
    expect(parseAuthCallback(
      "https://moment-play.example/?code=outer-code#/auth/callback?returnTo=%2Fminigames%2Fomok",
    )).toEqual({
      code: "outer-code",
      errorMessage: null,
      returnTo: "/minigames/omok",
    });
  });

  it("supports a future native callback URL and rejects an external return path", () => {
    expect(parseAuthCallback(
      "momentplay://auth/callback?code=native-code&returnTo=https%3A%2F%2Fattacker.example",
    )).toEqual({
      code: "native-code",
      errorMessage: null,
      returnTo: "/",
    });
  });

  it("returns recoverable errors for missing and provider-rejected callbacks", () => {
    expect(parseAuthCallback("https://moment-play.example/#/auth/callback").errorMessage).toMatch(/인증 코드/);
    expect(parseAuthCallback(
      "https://moment-play.example/#/auth/callback?error=access_denied&error_description=Expired",
    ).errorMessage).toBe("Expired");
  });

  it("exchanges a code once and prevents reuse", async () => {
    exchangeAuthCode.mockResolvedValueOnce({ user: { id: "user-1" } });
    const callbackUrl = "https://moment-play.example/?code=once#/auth/callback?returnTo=%2Fsettings";

    await expect(completeAuthCallback(callbackUrl)).resolves.toMatchObject({ returnTo: "/settings" });
    await expect(completeAuthCallback(callbackUrl)).rejects.toThrow(/이미 처리된/);
    expect(exchangeAuthCode).toHaveBeenCalledTimes(1);
  });

  it("scrubs the authorization code from browser history before exchange finishes", async () => {
    let resolveExchange;
    exchangeAuthCode.mockReturnValueOnce(new Promise((resolve) => {
      resolveExchange = resolve;
    }));
    window.history.replaceState(null, "", "/?code=secret#/auth/callback?returnTo=%2Ffriends");

    const pending = completeAuthCallback();
    expect(window.location.href).not.toContain("secret");
    resolveExchange({ user: { id: "user-1" } });
    await pending;
  });
});
