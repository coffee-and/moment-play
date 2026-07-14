import { describe, expect, it, vi } from "vitest";
import {
  cancelFriendRequest,
  fetchFriendOverview,
  fetchMyFriendProfile,
  findFriendByCode,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
} from "./friendsGateway.js";

function createClient(responses = {}) {
  return {
    rpc: vi.fn(async (name, params) => {
      const response = responses[name] ?? { data: null, error: null };
      return typeof response === "function" ? response(params) : response;
    }),
  };
}

describe("friendsGateway", () => {
  it("maps the current friend profile without exposing extra fields", async () => {
    const client = createClient({
      get_my_friend_profile: {
        data: [{ friend_code: "ABCDEF1234", nickname: "Sky", email: "private@example.com" }],
        error: null,
      },
    });

    await expect(fetchMyFriendProfile(client)).resolves.toEqual({
      friendCode: "ABCDEF1234",
      nickname: "Sky",
    });
  });

  it("normalizes friend codes before searching", async () => {
    const client = createClient({
      find_friend_by_code: {
        data: [{
          friend_code: "ABCDEF1234",
          nickname: "Moon",
          relationship_status: "none",
          user_id: "private-user-id",
        }],
        error: null,
      },
    });

    const result = await findFriendByCode("  abcdef1234  ", client);

    expect(client.rpc).toHaveBeenCalledWith("find_friend_by_code", {
      p_friend_code: "ABCDEF1234",
    });
    expect(result).toEqual({
      friendCode: "ABCDEF1234",
      nickname: "Moon",
      relationshipStatus: "none",
    });
    expect(result).not.toHaveProperty("userId");
  });

  it("passes only the friend code when creating a request", async () => {
    const client = createClient({
      send_friend_request: { data: "friendship-1", error: null },
    });

    await expect(sendFriendRequest("abcdef1234", client)).resolves.toEqual({
      friendshipId: "friendship-1",
    });
    expect(client.rpc).toHaveBeenCalledWith("send_friend_request", {
      p_friend_code: "ABCDEF1234",
    });
  });

  it("passes the request id and action when responding", async () => {
    const client = createClient({
      respond_friend_request: { data: "friendship-1", error: null },
    });

    await respondToFriendRequest("friendship-1", "accept", client);

    expect(client.rpc).toHaveBeenCalledWith("respond_friend_request", {
      p_friendship_id: "friendship-1",
      p_action: "accept",
    });
  });

  it("calls the cancellation and removal RPCs with the relationship id", async () => {
    const client = createClient({
      cancel_friend_request: { data: "friendship-2", error: null },
      remove_friend: { data: "friendship-3", error: null },
    });

    await expect(cancelFriendRequest("friendship-2", client)).resolves.toEqual({
      friendshipId: "friendship-2",
    });
    await expect(removeFriend("friendship-3", client)).resolves.toEqual({
      friendshipId: "friendship-3",
    });

    expect(client.rpc).toHaveBeenNthCalledWith(1, "cancel_friend_request", {
      p_friendship_id: "friendship-2",
    });
    expect(client.rpc).toHaveBeenNthCalledWith(2, "remove_friend", {
      p_friendship_id: "friendship-3",
    });
  });

  it("maps the overview contract and drops private response properties", async () => {
    const client = createClient({
      get_friend_overview: {
        data: [{
          friendship_id: "friendship-1",
          friend_code: "ABCDEF1234",
          nickname: "Moon",
          status: "pending",
          direction: "incoming",
          created_at: "2026-07-15T00:00:00Z",
          responded_at: null,
          requester_id: "private-requester-id",
          addressee_id: "private-addressee-id",
          email: "private@example.com",
        }],
        error: null,
      },
    });

    const [item] = await fetchFriendOverview(client);

    expect(item).toEqual({
      friendshipId: "friendship-1",
      friendCode: "ABCDEF1234",
      nickname: "Moon",
      status: "pending",
      direction: "incoming",
      createdAt: "2026-07-15T00:00:00Z",
      respondedAt: null,
    });
    expect(item).not.toHaveProperty("requesterId");
    expect(item).not.toHaveProperty("addresseeId");
    expect(item).not.toHaveProperty("email");
  });

  it("propagates Supabase errors", async () => {
    const error = { code: "42501", message: "Permanent account required" };
    const client = createClient({
      get_friend_overview: { data: null, error },
    });

    await expect(fetchFriendOverview(client)).rejects.toBe(error);
  });
});
