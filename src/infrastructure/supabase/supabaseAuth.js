import { getSupabaseClient } from "./supabaseClient.js";

// Read-only session check. Never creates a session — safe to call from local/computer
// match code paths that must not trigger an anonymous Supabase sign-in.
export async function getExistingSession(client = getSupabaseClient()) {
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) throw error;
  return session ?? null;
}

export async function ensureAnonymousSession(client = getSupabaseClient()) {
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();

  if (sessionError) throw sessionError;
  if (session) return session;

  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  if (!data.session) throw new Error("익명 사용자 세션을 만들지 못했습니다.");

  return data.session;
}
