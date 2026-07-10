import { getExistingSession } from "../../../../../infrastructure/supabase/supabaseAuth.js";
import { getSupabaseClient, isSupabaseConfigured } from "../../../../../infrastructure/supabase/supabaseClient.js";
import { getProfileByUserId, saveCurrentProfileNickname } from "../../../../../infrastructure/supabase/omokOnlineRoomGateway.js";
import {
  getLocalNickname,
  getLocalPlayerTwoNickname,
  saveLocalNickname,
  saveLocalPlayerTwoNickname,
} from "../../../../../shared/profile/nicknameStorage.js";
import { isFallbackOnlineNickname, normalizeOnlineNickname, validateOnlineNickname } from "./omokOnline.utils.js";

export const GUEST_FALLBACK_NICKNAME = "Guest";
export const DEFAULT_LOCAL_PLAYER_TWO_NICKNAME = "Player 2";

function isValidLocalNickname(nickname) {
  return Boolean(nickname) && validateOnlineNickname(nickname).valid;
}

function normalizeAndValidate(rawNickname) {
  const validation = validateOnlineNickname(rawNickname);
  if (!validation.valid) throw new Error(validation.message);
  return normalizeOnlineNickname(validation.value);
}

// Precedence: existing profiles.nickname (only if a Supabase session already
// exists - never creates one) -> valid locally stored nickname -> "Guest".
// Used for Local Player 1 display, the Computer match, and to seed the online
// nickname-setup modal.
export async function resolveSharedNickname() {
  if (isSupabaseConfigured()) {
    try {
      const client = getSupabaseClient();
      const session = await getExistingSession(client);
      if (session) {
        const profile = await getProfileByUserId(session.user.id, client);
        if (profile?.nickname && !isFallbackOnlineNickname(profile.nickname)) {
          return profile.nickname;
        }
      }
    } catch {
      // A Supabase hiccup must never block local nickname resolution.
    }
  }

  const localNickname = getLocalNickname();
  if (isValidLocalNickname(localNickname)) return localNickname;

  return GUEST_FALLBACK_NICKNAME;
}

export function getResolvedLocalPlayerTwoNickname() {
  const stored = getLocalPlayerTwoNickname();
  return isValidLocalNickname(stored) ? stored : DEFAULT_LOCAL_PLAYER_TWO_NICKNAME;
}

// Local-only: normalize/validate + persist. Does not touch Supabase.
export function saveLocalSharedNickname(rawNickname) {
  const normalized = normalizeAndValidate(rawNickname);
  saveLocalNickname(normalized);
  return normalized;
}

export function saveLocalPlayerTwo(rawNickname) {
  const normalized = normalizeAndValidate(rawNickname);
  saveLocalPlayerTwoNickname(normalized);
  return normalized;
}

// Normalizes + validates, saves locally immediately, and also saves to
// `profiles` when (and only when) a Supabase session already exists. Never
// creates a session itself. Used by the local nickname field, where there is
// no separate pending online action to resume.
export async function saveSharedNickname(rawNickname) {
  const normalized = saveLocalSharedNickname(rawNickname);

  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    const session = await getExistingSession(client);
    if (session) {
      await saveCurrentProfileNickname(normalized, client);
    }
  }

  return normalized;
}

// Prefill for the online nickname-setup modal: local storage only (setup is
// only shown when no valid server nickname exists yet).
export function getNicknamePrefillForOnlineSetup() {
  const localNickname = getLocalNickname();
  return isValidLocalNickname(localNickname) ? localNickname : "";
}
