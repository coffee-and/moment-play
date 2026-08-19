import { getCurrentSession } from "../../../../../infrastructure/supabase/authGateway.js";
import { getSupabaseClient, isSupabaseConfigured } from "../../../../../infrastructure/supabase/supabaseClient.js";
import { getProfileByUserId, saveCurrentProfileNickname } from "../../../../../infrastructure/supabase/omokOnlineRoomGateway.js";
import {
  getLocalNickname,
  saveLocalNickname,
} from "../../../../../shared/profile/nicknameStorage.js";
import { isFallbackOnlineNickname, normalizeOnlineNickname, validateOnlineNickname } from "./omokOnline.utils.js";

export const GUEST_FALLBACK_NICKNAME = "Guest";

function isValidLocalNickname(nickname) {
  return Boolean(nickname) && validateOnlineNickname(nickname).valid;
}

function normalizeAndValidate(rawNickname) {
  const validation = validateOnlineNickname(rawNickname);
  if (!validation.valid) throw new Error(validation.message);
  return normalizeOnlineNickname(validation.value);
}

// A signed-in account owns its server profile identity. Never fall back to a
// nickname left in this browser by another account; that caused newly created
// accounts to inherit a previous user's local nickname. Local storage is used
// only when there is no Supabase session at all.
export async function resolveSharedNickname() {
  if (!isSupabaseConfigured()) return resolveLocalNickname();

  const client = getSupabaseClient();
  let session;
  try {
    session = await getCurrentSession(client);
  } catch {
    // Without a reliable session result, using browser-local identity could
    // expose a nickname left by another account on the same device.
    return GUEST_FALLBACK_NICKNAME;
  }

  if (!session) return resolveLocalNickname();

  try {
    const profile = await getProfileByUserId(session.user.id, client);
    return profile?.nickname && !isFallbackOnlineNickname(profile.nickname)
      ? profile.nickname
      : GUEST_FALLBACK_NICKNAME;
  } catch {
    return GUEST_FALLBACK_NICKNAME;
  }
}

function resolveLocalNickname() {
  const localNickname = getLocalNickname();
  if (isValidLocalNickname(localNickname)) return localNickname;

  return GUEST_FALLBACK_NICKNAME;
}

// Local-only: normalize/validate + persist. Does not touch Supabase.
export function saveLocalSharedNickname(rawNickname) {
  const normalized = normalizeAndValidate(rawNickname);
  saveLocalNickname(normalized);
  return normalized;
}

// Account and browser-local nicknames have separate owners. A signed-in
// account writes only to its server profile; local storage is reserved for a
// confirmed signed-out session so one account cannot leak into another.
export async function saveSharedNickname(rawNickname) {
  const normalized = normalizeAndValidate(rawNickname);

  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    const session = await getCurrentSession(client);
    if (session) {
      await saveCurrentProfileNickname(normalized, client);
      return normalized;
    }
  }

  saveLocalNickname(normalized);
  return normalized;
}

// Online profile setup always starts empty. Reusing the browser's local
// nickname here can leak a previous account's name into a newly created
// account on the same device.
export function getNicknamePrefillForOnlineSetup() {
  return "";
}
