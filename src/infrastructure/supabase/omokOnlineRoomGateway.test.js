import { afterEach, describe, expect, it, vi } from "vitest";

const mockSession = { user: { id: "user-1", is_anonymous: true } };

vi.mock("./supabaseAuth.js", () => ({
  ensureAnonymousSession: vi.fn(async () => mockSession),
}));

const { saveCurrentProfileNickname } = await import("./omokOnlineRoomGateway.js");

function createClient({ updateError = null } = {}) {
  const eq = vi.fn(async () => ({ data: null, error: updateError }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return { client: { from }, eq, from, update };
}

afterEach(() => {
  mockSession.user.is_anonymous = true;
  vi.restoreAllMocks();
});

describe("saveCurrentProfileNickname", () => {
  it("updates only the current user's own profile row via .update().eq('user_id', ...), never an upsert/insert", async () => {
    const { client, eq, from, update } = createClient();

    const result = await saveCurrentProfileNickname("New Name", client);

    expect(from).toHaveBeenCalledWith("profiles");
    expect(update).toHaveBeenCalledTimes(1);
    const [payload] = update.mock.calls[0];
    // The bug: an upsert previously re-set user_id via ON CONFLICT DO
    // UPDATE, which the table's column-scoped UPDATE grant doesn't permit.
    // A plain update must never include user_id in the SET payload.
    expect(payload.user_id).toBeUndefined();
    expect(payload.nickname).toBe("New Name");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual({ userId: "user-1", nickname: "New Name", needsNicknameSetup: false });
  });

  it("throws a clean Korean message and logs the technical error only in dev, never leaking the raw Supabase error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = createClient({
      updateError: { message: "permission denied for table profiles", code: "42501" },
    });

    let caught = null;
    try {
      await saveCurrentProfileNickname("New Name", client);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught.message).toMatch(/저장하지 못했어요/);
    expect(caught.message).not.toMatch(/permission denied/);
    expect(consoleError).toHaveBeenCalled();
  });

  it("uses the identical update flow for an anonymous authenticated session as for a permanent one", async () => {
    mockSession.user.is_anonymous = true;
    const anon = createClient();
    await saveCurrentProfileNickname("Anon Name", anon.client);
    expect(anon.eq).toHaveBeenCalledWith("user_id", "user-1");

    mockSession.user.is_anonymous = false;
    const permanent = createClient();
    await saveCurrentProfileNickname("Real Name", permanent.client);
    expect(permanent.eq).toHaveBeenCalledWith("user_id", "user-1");
  });
});
