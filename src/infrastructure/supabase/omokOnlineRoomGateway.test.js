import { afterEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedSession = vi.fn(async () => ({ user: { id: "user-1" } }));
vi.mock("./authGateway.js", () => ({ requireAuthenticatedSession }));

const { saveCurrentProfileNickname } = await import("./omokOnlineRoomGateway.js");

function createClient({ rpcError = null } = {}) {
  const rpc = vi.fn(async () => ({ data: "New Name", error: rpcError }));
  return { client: { rpc }, rpc };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("saveCurrentProfileNickname", () => {
  it("updates the authenticated profile through the authorized server function", async () => {
    const { client, rpc } = createClient();

    const result = await saveCurrentProfileNickname("  New   Name  ", client);

    expect(requireAuthenticatedSession).toHaveBeenCalledWith(client);
    expect(rpc).toHaveBeenCalledWith("update_my_profile_nickname", {
      p_nickname: "New Name",
    });
    expect(result).toEqual({ userId: "user-1", nickname: "New Name", needsNicknameSetup: false });
    expect(client.auth).toBeUndefined();
  });

  it("does not call the server before nickname validation succeeds", async () => {
    const { client, rpc } = createClient();
    await expect(saveCurrentProfileNickname("a", client)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns a recoverable message when the server rejects the update", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = createClient({
      rpcError: { message: "permission denied", code: "42501" },
    });

    await expect(saveCurrentProfileNickname("New Name", client)).rejects.toThrow(/저장하지 못했어요/);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
