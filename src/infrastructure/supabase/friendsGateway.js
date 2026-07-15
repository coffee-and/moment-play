import { getSupabaseClient } from "./supabaseClient.js";

function throwIfError(error) {
  if (error) throw error;
}

function normalizeFriendCode(friendCode) {
  return String(friendCode ?? "").trim().toUpperCase();
}

function mapFriendProfile(row) {
  if (!row) return null;

  return {
    friendCode: row.friend_code,
    nickname: row.nickname,
  };
}

function mapFriendSearchResult(row) {
  if (!row) return null;

  return {
    friendCode: row.friend_code,
    nickname: row.nickname,
    relationshipStatus: row.relationship_status,
  };
}

function mapFriendOverviewItem(row) {
  return {
    friendshipId: row.friendship_id,
    friendCode: row.friend_code,
    nickname: row.nickname,
    status: row.status,
    direction: row.direction,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

export async function fetchMyFriendProfile(client = getSupabaseClient()) {
  const { data, error } = await client.rpc("get_my_friend_profile");
  throwIfError(error);
  return mapFriendProfile(data?.[0] ?? null);
}

export async function findFriendByCode(friendCode, client = getSupabaseClient()) {
  const { data, error } = await client.rpc("find_friend_by_code", {
    p_friend_code: normalizeFriendCode(friendCode),
  });
  throwIfError(error);
  return mapFriendSearchResult(data?.[0] ?? null);
}

export async function sendFriendRequest(friendCode, client = getSupabaseClient()) {
  const { data, error } = await client.rpc("send_friend_request", {
    p_friend_code: normalizeFriendCode(friendCode),
  });
  throwIfError(error);
  return { friendshipId: data };
}

export async function respondToFriendRequest(friendshipId, action, client = getSupabaseClient()) {
  const { data, error } = await client.rpc("respond_friend_request", {
    p_friendship_id: friendshipId,
    p_action: action,
  });
  throwIfError(error);
  return { friendshipId: data };
}

export async function cancelFriendRequest(friendshipId, client = getSupabaseClient()) {
  const { data, error } = await client.rpc("cancel_friend_request", {
    p_friendship_id: friendshipId,
  });
  throwIfError(error);
  return { friendshipId: data };
}

export async function removeFriend(friendshipId, client = getSupabaseClient()) {
  const { data, error } = await client.rpc("remove_friend", {
    p_friendship_id: friendshipId,
  });
  throwIfError(error);
  return { friendshipId: data };
}

export async function fetchFriendOverview(client = getSupabaseClient()) {
  const { data, error } = await client.rpc("get_friend_overview");
  throwIfError(error);
  return (data ?? []).map(mapFriendOverviewItem);
}
