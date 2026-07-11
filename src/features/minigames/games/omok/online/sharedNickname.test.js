// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ensureAnonymousSession = vi.fn();
const getExistingSession = vi.fn();
const isSupabaseConfigured = vi.fn();
const getSupabaseClient = vi.fn(() => ({}));
const getProfileByUserId = vi.fn();
const saveCurrentProfileNickname = vi.fn();

vi.mock("../../../../../infrastructure/supabase/supabaseAuth.js", () => ({
  ensureAnonymousSession,
  getExistingSession,
}));

vi.mock("../../../../../infrastructure/supabase/supabaseClient.js", () => ({
  getSupabaseClient,
  isSupabaseConfigured,
}));

vi.mock("../../../../../infrastructure/supabase/omokOnlineRoomGateway.js", () => ({
  getProfileByUserId,
  saveCurrentProfileNickname,
}));

const {
  GUEST_FALLBACK_NICKNAME,
  resolveSharedNickname,
  saveLocalSharedNickname,
  saveSharedNickname,
} = await import("./sharedNickname.js");

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("resolveSharedNickname precedence", () => {
  it("uses the profile nickname when a Supabase session already exists", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getExistingSession.mockResolvedValue({ user: { id: "user-1" } });
    getProfileByUserId.mockResolvedValue({ nickname: "ServerNick" });

    const result = await resolveSharedNickname();

    expect(result).toBe("ServerNick");
    expect(ensureAnonymousSession).not.toHaveBeenCalled();
  });

  it("falls back to the locally stored nickname when no session exists", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getExistingSession.mockResolvedValue(null);
    saveLocalSharedNickname("LocalNick");

    const result = await resolveSharedNickname();

    expect(result).toBe("LocalNick");
    expect(getProfileByUserId).not.toHaveBeenCalled();
    expect(ensureAnonymousSession).not.toHaveBeenCalled();
  });

  it("falls back to Guest when there is no session and no valid local nickname", async () => {
    isSupabaseConfigured.mockReturnValue(false);

    const result = await resolveSharedNickname();

    expect(result).toBe(GUEST_FALLBACK_NICKNAME);
    expect(ensureAnonymousSession).not.toHaveBeenCalled();
  });

  it("never creates an anonymous Supabase session while resolving or saving locally", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getExistingSession.mockResolvedValue(null);

    await resolveSharedNickname();
    saveLocalSharedNickname("LocalOnly");

    expect(ensureAnonymousSession).not.toHaveBeenCalled();
  });
});

describe("saveSharedNickname", () => {
  it("saves locally immediately and does not touch Supabase without a session", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getExistingSession.mockResolvedValue(null);

    const saved = await saveSharedNickname("  Sunny   Day  ");

    expect(saved).toBe("Sunny Day");
    expect(saveCurrentProfileNickname).not.toHaveBeenCalled();
    expect(ensureAnonymousSession).not.toHaveBeenCalled();
  });

  it("also saves to profiles when a session already exists", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getExistingSession.mockResolvedValue({ user: { id: "user-1" } });

    await saveSharedNickname("Sunny");

    expect(saveCurrentProfileNickname).toHaveBeenCalledWith("Sunny", expect.anything());
  });

  it("rejects an invalid nickname without persisting it", async () => {
    isSupabaseConfigured.mockReturnValue(false);

    await expect(saveSharedNickname("a")).rejects.toThrow();
  });
});
