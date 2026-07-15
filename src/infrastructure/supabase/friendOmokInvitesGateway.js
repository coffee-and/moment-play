import { getSupabaseClient } from "./supabaseClient.js";

function throwIfError(error) {
  if (error) throw error;
}

function mapInvite(row) {
  if (!row) return null;

  return {
    inviteId: row.invite_id,
    direction: row.direction,
    status: row.status ?? row.invite_status,
    friendCode: row.friend_code,
    nickname: row.nickname,
    roomId: row.room_id,
    gameMode: row.game_mode,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    respondedAt: row.responded_at,
  };
}

export async function createFriendOmokInvite({
  friendshipId,
  gameMode,
  guideSettings,
  roomGuideSettings,
}, client = getSupabaseClient()) {
  const { data, error } = await client.rpc("create_friend_omok_invite", {
    p_friendship_id: friendshipId,
    p_game_mode: gameMode,
    p_show_forbidden_positions: Boolean(guideSettings.showForbiddenPositions),
    p_explain_forbidden_reasons: Boolean(guideSettings.explainForbiddenReasons),
    p_allow_forbidden_positions: Boolean(roomGuideSettings.allowForbiddenPositions),
    p_allow_forbidden_reasons: Boolean(roomGuideSettings.allowForbiddenReasons),
  });

  throwIfError(error);
  return mapInvite(data?.[0] ?? null);
}

export async function respondToFriendOmokInvite(inviteId, action, client = getSupabaseClient()) {
  const { data, error } = await client.rpc("respond_friend_omok_invite", {
    p_invite_id: inviteId,
    p_action: action,
  });

  throwIfError(error);
  return mapInvite(data?.[0] ?? null);
}

export async function cancelFriendOmokInvite(inviteId, client = getSupabaseClient()) {
  const { data, error } = await client.rpc("cancel_friend_omok_invite", {
    p_invite_id: inviteId,
  });

  throwIfError(error);
  return mapInvite(data?.[0] ?? null);
}

export async function fetchFriendOmokInvites(client = getSupabaseClient()) {
  const { data, error } = await client.rpc("get_friend_omok_invites");
  throwIfError(error);
  return (data ?? []).map(mapInvite);
}

export async function fetchPendingFriendOmokInviteCount(client = getSupabaseClient()) {
  const { data, error } = await client.rpc("get_pending_friend_omok_invite_count");
  throwIfError(error);
  return Number(data ?? 0);
}
