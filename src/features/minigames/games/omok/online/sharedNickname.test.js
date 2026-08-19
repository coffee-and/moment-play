// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLocalNickname } from "../../../../../shared/profile/nicknameStorage.js";

const getCurrentSession = vi.fn();
const isSupabaseConfigured = vi.fn();
const getSupabaseClient = vi.fn(() => ({}));
const getProfileByUserId = vi.fn();
const saveCurrentProfileNickname = vi.fn();

vi.mock("../../../../../infrastructure/supabase/authGateway.js", () => ({
  getCurrentSession,
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
  getNicknamePrefillForOnlineSetup,
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
    getCurrentSession.mockResolvedValue({ user: { id: "user-1" } });
    getProfileByUserId.mockResolvedValue({ nickname: "ServerNick" });

    const result = await resolveSharedNickname();

    expect(result).toBe("ServerNick");
  });

  it("does not inherit a previous account's local nickname when the signed-in profile still has a fallback", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getCurrentSession.mockResolvedValue({ user: { id: "user-2" } });
    getProfileByUserId.mockResolvedValue({ nickname: "Player-abc12" });
    saveLocalSharedNickname("PreviousUser");

    const result = await resolveSharedNickname();

    expect(result).toBe(GUEST_FALLBACK_NICKNAME);
  });

  it("does not expose a local nickname when the signed-in profile cannot be loaded", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getCurrentSession.mockResolvedValue({ user: { id: "user-2" } });
    getProfileByUserId.mockRejectedValue(new Error("network unavailable"));
    saveLocalSharedNickname("PreviousUser");

    await expect(resolveSharedNickname()).resolves.toBe(GUEST_FALLBACK_NICKNAME);
  });

  it("does not use local identity when session state cannot be determined", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getCurrentSession.mockRejectedValue(new Error("session unavailable"));
    saveLocalSharedNickname("PreviousUser");

    await expect(resolveSharedNickname()).resolves.toBe(GUEST_FALLBACK_NICKNAME);
  });

  it("falls back to the locally stored nickname when no session exists", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getCurrentSession.mockResolvedValue(null);
    saveLocalSharedNickname("LocalNick");

    const result = await resolveSharedNickname();

    expect(result).toBe("LocalNick");
    expect(getProfileByUserId).not.toHaveBeenCalled();
  });

  it("falls back to Guest when there is no session and no valid local nickname", async () => {
    isSupabaseConfigured.mockReturnValue(false);

    const result = await resolveSharedNickname();

    expect(result).toBe(GUEST_FALLBACK_NICKNAME);
  });

  it("keeps local nickname resolution read-only when there is no session", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getCurrentSession.mockResolvedValue(null);

    await resolveSharedNickname();
    saveLocalSharedNickname("LocalOnly");

    expect(getProfileByUserId).not.toHaveBeenCalled();
    expect(saveCurrentProfileNickname).not.toHaveBeenCalled();
  });

  it("starts online account nickname setup empty even when a local nickname exists", () => {
    saveLocalSharedNickname("PreviousUser");
    expect(getNicknamePrefillForOnlineSetup()).toBe("");
  });
});

describe("saveSharedNickname", () => {
  it("saves locally immediately and does not touch Supabase without a session", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getCurrentSession.mockResolvedValue(null);

    const saved = await saveSharedNickname("  Sunny   Day  ");

    expect(saved).toBe("Sunny Day");
    expect(saveCurrentProfileNickname).not.toHaveBeenCalled();
  });

  it("also saves to profiles when a session already exists", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getCurrentSession.mockResolvedValue({ user: { id: "user-1" } });

    await saveSharedNickname("Sunny");

    expect(saveCurrentProfileNickname).toHaveBeenCalledWith("Sunny", expect.anything());
    expect(getLocalNickname()).toBeNull();
  });

  it("does not change local identity when the signed-in profile save fails", async () => {
    isSupabaseConfigured.mockReturnValue(true);
    getCurrentSession.mockResolvedValue({ user: { id: "user-1" } });
    saveCurrentProfileNickname.mockRejectedValue(new Error("save failed"));
    saveLocalSharedNickname("PreviousUser");

    await expect(saveSharedNickname("Sunny")).rejects.toThrow("save failed");
    expect(getLocalNickname()).toBe("PreviousUser");
  });

  it("rejects an invalid nickname without persisting it", async () => {
    isSupabaseConfigured.mockReturnValue(false);

    await expect(saveSharedNickname("a")).rejects.toThrow();
  });
});
