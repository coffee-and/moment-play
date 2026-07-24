import { ensureAnonymousSession } from "./supabaseAuth.js";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";
import { ONLINE_NICKNAME_SAVE_FAILED_MESSAGE } from "../../features/minigames/games/omok/online/omokOnline.constants.js";
import {
  createOmokInviteUrl,
  getFallbackOnlineNickname,
  isFallbackOnlineNickname,
  mapOmokMoveRow,
  mapOmokRoomRow,
  normalizeOnlineNickname,
  validateOnlineNickname,
} from "../../features/minigames/games/omok/online/omokOnline.utils.js";

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && typeof error.message === "string") return error.message;
  return fallbackMessage;
}

function throwIfSupabaseError(error, fallbackMessage) {
  if (!error) return;
  throw new Error(getErrorMessage(error, fallbackMessage));
}

async function getCurrentUserId(client = getSupabaseClient()) {
  const session = await ensureAnonymousSession(client);
  return session.user.id;
}

export async function getProfileByUserId(userId, client = getSupabaseClient()) {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  throwIfSupabaseError(error, "프로필을 불러오지 못했습니다.");
  return data;
}

async function getOrCreateProfileNickname(userId, client = getSupabaseClient()) {
  const profile = await getProfileByUserId(userId, client);
  if (profile?.nickname) return profile.nickname;

  const fallbackNickname = getFallbackOnlineNickname(userId);
  const { error } = await client.from("profiles").insert({
    user_id: userId,
    nickname: fallbackNickname,
  });

  throwIfSupabaseError(error, "임시 닉네임을 만들지 못했습니다.");
  return fallbackNickname;
}

export async function getCurrentProfileState(client = getSupabaseClient()) {
  const userId = await getCurrentUserId(client);
  const profile = await getProfileByUserId(userId, client);
  const nickname = profile?.nickname ?? null;
  const needsNicknameSetup = isFallbackOnlineNickname(nickname);

  return {
    userId,
    nickname: needsNicknameSetup ? null : nickname,
    needsNicknameSetup,
  };
}

export async function saveCurrentProfileNickname(nickname, client = getSupabaseClient()) {
  const validation = validateOnlineNickname(nickname);
  if (!validation.valid) throw new Error(validation.message);

  const userId = await getCurrentUserId(client);
  const normalizedNickname = normalizeOnlineNickname(validation.value);

  // A plain update, not an upsert: the omok_handle_new_auth_user trigger
  // (see supabase/migrations) already inserts a profiles row for every new
  // auth.users row, anonymous or not, so there is always an existing row to
  // update here. Upsert's ON CONFLICT DO UPDATE previously also tried to set
  // user_id (it re-sets every column in the payload, including the conflict
  // key), which the table's column-scoped UPDATE grant
  // (nickname, updated_at only) does not permit - failing with "permission
  // denied for table profiles" even though the RLS policy itself was fine.
  const { error } = await client
    .from("profiles")
    .update({
      nickname: normalizedNickname,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    if (import.meta.env.DEV) console.error("saveCurrentProfileNickname failed:", error);
    throw new Error(ONLINE_NICKNAME_SAVE_FAILED_MESSAGE);
  }

  // Header/account labels use Supabase user metadata. Keep it aligned with the
  // public profile nickname so a successful nickname setup does not continue
  // to show the email prefix until the next login. This is best-effort because
  // the profile row is the authoritative gameplay identity.
  const { error: metadataError } = await client.auth.updateUser({
    data: { nickname: normalizedNickname },
  });
  if (metadataError && import.meta.env.DEV) {
    console.warn("saveCurrentProfileNickname metadata sync failed:", metadataError);
  }

  return {
    userId,
    nickname: normalizedNickname,
    needsNicknameSetup: false,
  };
}

export async function getOmokOnlineRoom(roomId, client = getSupabaseClient()) {
  const { data: room, error: roomError } = await client
    .from("omok_rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  throwIfSupabaseError(roomError, "방을 불러오지 못했습니다.");

  const { data: players, error: playersError } = await client
    .from("omok_room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  throwIfSupabaseError(playersError, "방 참가자 정보를 불러오지 못했습니다.");

  return mapOmokRoomRow(room, players ?? []);
}

export async function getOmokOnlineRoomMoves(roomId, roundNumber, client = getSupabaseClient()) {
  const { data, error } = await client
    .from("omok_room_moves")
    .select("*")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber)
    .order("move_number", { ascending: true });

  throwIfSupabaseError(error, "착수 목록을 불러오지 못했습니다.");
  return (data ?? []).map(mapOmokMoveRow);
}

export async function getOmokOnlineRoomSnapshot(roomId, client = getSupabaseClient()) {
  const room = await getOmokOnlineRoom(roomId, client);
  const moves = room.status === "playing"
    ? await getOmokOnlineRoomMoves(roomId, room.currentRound, client)
    : [];

  return { room, moves };
}

export async function createOmokOnlineRoom({ gameMode, guideSettings, roomGuideSettings }, client = getSupabaseClient()) {
  const userId = await getCurrentUserId(client);
  await getOrCreateProfileNickname(userId, client);

  const { data: roomId, error } = await client.rpc("omok_create_room", {
    p_allow_forbidden_positions: Boolean(roomGuideSettings.allowForbiddenPositions),
    p_allow_forbidden_reasons: Boolean(roomGuideSettings.allowForbiddenReasons),
    p_explain_forbidden_reasons: Boolean(guideSettings.explainForbiddenReasons),
    p_game_mode: gameMode,
    p_show_forbidden_positions: Boolean(guideSettings.showForbiddenPositions),
  });

  throwIfSupabaseError(error, "방을 만들지 못했습니다.");

  const { room, moves } = await getOmokOnlineRoomSnapshot(roomId, client);
  return {
    room,
    moves,
    userId,
    inviteUrl: createOmokInviteUrl(room.id),
  };
}

export async function joinOmokOnlineRoom(roomId, client = getSupabaseClient()) {
  const userId = await getCurrentUserId(client);
  await getOrCreateProfileNickname(userId, client);

  const { error } = await client.rpc("omok_join_room", {
    p_room_id: roomId,
  });

  throwIfSupabaseError(error, "방에 입장하지 못했습니다.");

  const { room, moves } = await getOmokOnlineRoomSnapshot(roomId, client);
  return {
    room,
    moves,
    userId,
    inviteUrl: createOmokInviteUrl(room.id),
  };
}

export async function leaveOmokOnlineRoom(roomId, client = getSupabaseClient()) {
  const { error } = await client.rpc("omok_leave_room", {
    p_room_id: roomId,
  });

  throwIfSupabaseError(error, "방을 나가지 못했습니다.");
}

export async function setOmokOnlineReady(roomId, ready, client = getSupabaseClient()) {
  const userId = await getCurrentUserId(client);
  const { error } = await client
    .from("omok_room_players")
    .update({ ready: Boolean(ready) })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  throwIfSupabaseError(error, "준비 상태를 바꾸지 못했습니다.");
  return getOmokOnlineRoomSnapshot(roomId, client);
}

export async function setOmokOnlineGuidePreferences(roomId, guideSettings, client = getSupabaseClient()) {
  const { error } = await client.rpc("omok_update_player_guide_preferences", {
    p_explain_forbidden_reasons: Boolean(guideSettings.explainForbiddenReasons),
    p_room_id: roomId,
    p_show_forbidden_positions: Boolean(guideSettings.showForbiddenPositions),
  });

  throwIfSupabaseError(error, "안내 설정을 저장하지 못했습니다.");
  return getOmokOnlineRoomSnapshot(roomId, client);
}

export async function updateOmokOnlineRoomSettings(roomId, roomSettings, client = getSupabaseClient()) {
  const { error } = await client.rpc("omok_update_room_settings", {
    p_allow_forbidden_positions: Boolean(roomSettings.allowForbiddenPositions),
    p_allow_forbidden_reasons: Boolean(roomSettings.allowForbiddenReasons),
    p_game_mode: roomSettings.gameMode,
    p_room_id: roomId,
  });

  throwIfSupabaseError(error, "방 설정을 저장하지 못했습니다.");
  return getOmokOnlineRoomSnapshot(roomId, client);
}

export async function startOmokOnlineRoom(roomId, client = getSupabaseClient()) {
  const { error } = await client.rpc("omok_start_room", {
    p_room_id: roomId,
  });

  throwIfSupabaseError(error, "대국을 시작하지 못했습니다.");
  return getOmokOnlineRoomSnapshot(roomId, client);
}

export async function submitOmokOnlineMove({ roomId, roundNumber, moveNumber, position, stone }, client = getSupabaseClient()) {
  const { error } = await client.rpc("omok_submit_move", {
    p_col_index: position.col,
    p_move_number: moveNumber,
    p_room_id: roomId,
    p_round_number: roundNumber,
    p_row_index: position.row,
    p_stone: stone,
  });

  throwIfSupabaseError(error, "착수를 동기화하지 못했습니다.");
  return getOmokOnlineRoomSnapshot(roomId, client);
}

export async function requestOmokOnlineRematch(roomId, client = getSupabaseClient()) {
  const { error } = await client.rpc("omok_request_rematch", {
    p_room_id: roomId,
  });

  throwIfSupabaseError(error, "재대결을 요청하지 못했습니다.");
  return getOmokOnlineRoomSnapshot(roomId, client);
}

export async function cancelOmokOnlineRematch(roomId, client = getSupabaseClient()) {
  const { error } = await client.rpc("omok_cancel_rematch", {
    p_room_id: roomId,
  });

  throwIfSupabaseError(error, "재대결 요청을 취소하지 못했습니다.");
  return getOmokOnlineRoomSnapshot(roomId, client);
}

export async function acceptOmokOnlineRematch(roomId, client = getSupabaseClient()) {
  const { error } = await client.rpc("omok_accept_rematch", {
    p_room_id: roomId,
  });

  throwIfSupabaseError(error, "재대결을 수락하지 못했습니다.");
  return getOmokOnlineRoomSnapshot(roomId, client);
}

export const omokOnlineRoomGateway = {
  isConfigured: isSupabaseConfigured,
  getCurrentProfileState,
  saveCurrentProfileNickname,
  createRoom: createOmokOnlineRoom,
  joinRoom: joinOmokOnlineRoom,
  refreshRoom: getOmokOnlineRoomSnapshot,
  leaveRoom: leaveOmokOnlineRoom,
  setReady: setOmokOnlineReady,
  setGuidePreferences: setOmokOnlineGuidePreferences,
  updateRoomSettings: updateOmokOnlineRoomSettings,
  startRoom: startOmokOnlineRoom,
  submitMove: submitOmokOnlineMove,
  requestRematch: requestOmokOnlineRematch,
  cancelRematch: cancelOmokOnlineRematch,
  acceptRematch: acceptOmokOnlineRematch,
};