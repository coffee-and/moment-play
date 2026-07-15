import { afterEach, describe, expect, it, vi } from "vitest";

const mockSession = { user: { id: "user-1", is_anonymous: true } };

vi.mock("./supabaseAuth.js", () => ({
  ensureAnonymousSession: vi.fn(async () => mockSession),
}));

const { saveCurrentProfileNickname } = await import("./omokOnlineRoomGateway.js");

function createClient({ updateError = null, metadataError = null } = {}) {
  const eq = vi.fn(async () => ({ data: null, error: updateError }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  const updateUser = vi.fn(async () => ({ data: null, error: metadataError }));
  return { client: { auth: { updateUser }, from }, eq, from, update, updateUser };
}

afterEach(() => {
  mockSession.user.is_anonymous = true;
  vi.restoreAllMocks();
});

describe("saveCurrentProfileNickname", () => {
  it("updates only the current user's profile row and synchronizes account metadata", async () => {
    const { client, eq, from, update, updateUser } = createClient();

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
    expect(updateUser).toHaveBeenCalledWith({ data: { nickname: "New Name" } });
    expect(result).toEqual({ userId: "user-1", nickname: "New Name", needsNicknameSetup: false });
  });

  it("throws a clean Korean message and logs the technical profile error only in dev", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client, updateUser } = createClient({
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
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("keeps the profile save successful when account metadata synchronization fails", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { client } = createClient({ metadataError: { message: "metadata unavailable" } });

    await expect(saveCurrentProfileNickname("New Name", client)).resolves.toMatchObject({
      nickname: "New Name",
      needsNicknameSetup: false,
    });
    expect(consoleWarn).toHaveBeenCalled();
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
