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

function assertPermanentAccount(authStatus, user) {
  if (authStatus !== "authenticated" || !user) {
    throw new ResultSubmissionNotAllowedError("로그인해야 랭킹 기록을 저장할 수 있습니다.");
  }
}

export async function beginRankedGameAttempt({
  authStatus,
  user,
  gameKey,
  mode = null,
  context = {},
}, client = getSupabaseClient()) {
  assertPermanentAccount(authStatus, user);

  const { data, error } = await client.rpc("begin_ranked_game", {
    p_game_key: gameKey,
    p_mode: mode,
    p_context: context,
  });
  if (error) throw error;
  if (!data?.attemptId) throw new Error("랭킹 게임 시도를 시작하지 못했습니다.");

  const attempt = {
    attemptId: data.attemptId,
    seed: data.seed ?? null,
    startedAt: data.startedAt ?? null,
  };
  if (gameKey !== "sudoku") return attempt;
  if (
    typeof data.puzzleId !== "string"
    || Number(data.proofVersion) !== 2
    || !/^[0-9]{81}$/.test(data.puzzle)
  ) {
    throw new Error("서버가 유효한 스도쿠 퍼즐을 발급하지 않았습니다.");
  }

  return {
    ...attempt,
    proofVersion: Number(data.proofVersion),
    puzzleId: data.puzzleId,
    puzzle: [...data.puzzle].map(Number),
  };
}

export async function submitGameResult({ authStatus, user, result }, client = getSupabaseClient()) {
  assertPermanentAccount(authStatus, user);

  const { data, error } = await client.rpc("complete_ranked_game", {
    p_attempt_id: result.attemptId,
    p_client_submission_id: result.clientSubmissionId,
    p_proof: result.proof,
  });
  if (error) throw error;
  return data;
}
