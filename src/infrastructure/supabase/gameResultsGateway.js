import { getSupabaseClient } from "./supabaseClient.js";

const DEFAULT_LEADERBOARD_LIMIT = 50;

export class ResultSubmissionNotAllowedError extends Error {}

function mapLeaderboardEntry(row) {
  return {
    rank: Number(row.rank),
    nickname: row.nickname,
    gameKey: row.game_key,
    mode: row.mode,
    scoreValue: row.score_value === null ? null : Number(row.score_value),
    durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    matchResult: row.match_result,
    createdAt: row.created_at,
    isCurrentUser: Boolean(row.is_current_user),
  };
}

export async function fetchLeaderboard({ gameKey, mode = null, limit = DEFAULT_LEADERBOARD_LIMIT }, client = getSupabaseClient()) {
  const { data, error } = await client.rpc("get_game_leaderboard", {
    p_game_key: gameKey,
    p_mode: mode,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).map(mapLeaderboardEntry);
}

export async function submitGameResult({ authStatus, user, result }, client = getSupabaseClient()) {
  if (authStatus !== "authenticated" || !user || user.is_anonymous) {
    throw new ResultSubmissionNotAllowedError("영구 계정으로 로그인해야 랭킹 기록을 저장할 수 있습니다.");
  }

  const row = {
    user_id: user.id,
    game_key: result.gameKey,
    mode: result.mode ?? null,
    score_value: result.scoreValue ?? null,
    duration_ms: result.durationMs ?? null,
    match_result: result.matchResult ?? null,
    client_submission_id: result.clientSubmissionId,
  };
  const { error } = await client.from("game_results").insert(row);
  if (error?.code === "23505") return { duplicate: true };
  if (error) throw error;
  return { duplicate: false };
}
