import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

let supabaseClient = null;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseConfigStatus() {
  return {
    isConfigured: isSupabaseConfigured(),
    missingUrl: !SUPABASE_URL,
    missingPublishableKey: !SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("온라인 방 기능을 사용하려면 Supabase 환경 변수가 필요합니다.");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        // PKCE puts the auth code in a `?code=` query param rather than a
        // `#access_token=...` hash fragment - the latter would collide with
        // this app's HashRouter (`#/route`). See CompleteSignupPage.jsx,
        // which exchanges that code for a session explicitly.
        flowType: "pkce",
        persistSession: true,
      },
    });
  }

  return supabaseClient;
}
