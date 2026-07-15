import { describe, expect, it, vi } from "vitest";
import {
  cancelFriendOmokInvite,
  createFriendOmokInvite,
  fetchFriendOmokInvites,
  fetchPendingFriendOmokInviteCount,
  respondToFriendOmokInvite,
} from "./friendOmokInvitesGateway.js";

function createClient({ data = null, error = null } = {}) {
  return {
    rpc: vi.fn(async () => ({ data, error })),
  };
}

const settings = {
  friendshipId: "friendship-1",
  gameMode: "standard",
  guideSettings: {
    showForbiddenPositions: true,
    explainForbiddenReasons: false,
  },
  roomGuideSettings: {
    allowForbiddenPositions: true,
    allowForbiddenReasons: false,
  },
};

describe("friendOmokInvitesGateway", () => {
  it("creates an invite with the existing Omok room settings contract", async () => {
    const client = createClient({
      data: [{
        invite_id: "invite-1",
        room_id: "room-1",
        expires_at: "2026-07-16T01:15:00Z",
      }],
    });

    const result = await createFriendOmokInvite(settings, client);

    expect(client.rpc).toHaveBeenCalledWith("create_friend_omok_invite", {
      p_friendship_id: "friendship-1",
      p_game_mode: "standard",
      p_show_forbidden_positions: true,
      p_explain_forbidden_reasons: false,
      p_allow_forbidden_positions: true,
      p_allow_forbidden_reasons: false,
    });
    expect(result).toEqual(expect.objectContaining({
      inviteId: "invite-1",
      roomId: "room-1",
      expiresAt: "2026-07-16T01:15:00Z",
    }));
  });

  it("maps only the approved invite overview fields", async () => {
    const client = createClient({
      data: [{
        invite_id: "invite-1",
        direction: "incoming",
        status: "pending",
        friend_code: "BBBBBBBB02",
        nickname: "FriendBeta",
        room_id: "room-1",
        game_mode: "standard",
        created_at: "2026-07-16T01:00:00Z",
        expires_at: "2026-07-16T01:15:00Z",
        responded_at: null,
        sender_id: "private-sender-id",
        receiver_id: "private-receiver-id",
        email: "private@example.com",
      }],
    });

    const [invite] = await fetchFriendOmokInvites(client);

    expect(invite).toEqual({
      inviteId: "invite-1",
      direction: "incoming",
      status: "pending",
      friendCode: "BBBBBBBB02",
      nickname: "FriendBeta",
      roomId: "room-1",
      gameMode: "standard",
      createdAt: "2026-07-16T01:00:00Z",
      expiresAt: "2026-07-16T01:15:00Z",
      respondedAt: null,
    });
    expect(invite).not.toHaveProperty("senderId");
    expect(invite).not.toHaveProperty("receiverId");
    expect(invite).not.toHaveProperty("email");
  });

  it("accepts or declines an incoming invite through the response RPC", async () => {
    const client = createClient({
      data: [{ invite_id: "invite-1", room_id: "room-1", invite_status: "accepted" }],
    });

    await expect(respondToFriendOmokInvite("invite-1", "accept", client)).resolves.toEqual(
      expect.objectContaining({ inviteId: "invite-1", roomId: "room-1", status: "accepted" }),
    );
    expect(client.rpc).toHaveBeenCalledWith("respond_friend_omok_invite", {
      p_invite_id: "invite-1",
      p_action: "accept",
    });
  });

  it("cancels an outgoing invite through the sender-only RPC", async () => {
    const client = createClient({
      data: [{ invite_id: "invite-1", room_id: null, invite_status: "cancelled" }],
    });

    await expect(cancelFriendOmokInvite("invite-1", client)).resolves.toEqual(
      expect.objectContaining({ inviteId: "invite-1", roomId: null, status: "cancelled" }),
    );
    expect(client.rpc).toHaveBeenCalledWith("cancel_friend_omok_invite", {
      p_invite_id: "invite-1",
    });
  });

  it("normalizes the pending incoming invite count to a number", async () => {
    const client = createClient({ data: "3" });
    await expect(fetchPendingFriendOmokInviteCount(client)).resolves.toBe(3);
  });

  it("propagates Supabase RPC errors", async () => {
    const error = new Error("offline");
    const client = createClient({ error });

    await expect(fetchFriendOmokInvites(client)).rejects.toBe(error);
  });
});
