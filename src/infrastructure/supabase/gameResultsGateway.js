import { getSupabaseClient } from "./supabaseClient.js";

const DEFAULT_LEADERBOARD_LIMIT = 50;

export class ResultSubmissionNotAllowedError extends Error {}

function mapLeaderboardEntry(row) {
  return {
    rank: Number(row.rank),
    nickname: row.nickname,
    gameKey: row.game_key,
    boardKey: row.board_key,
    challengeKey: row.challenge_key,
    rulesVersion: row.rules_version,
    metrics: row.metrics && typeof row.metrics === "object" ? row.metrics : {},
    createdAt: row.created_at,
    isCurrentUser: Boolean(row.is_current_user),
  };
}

export async function fetchLeaderboard({
  gameKey,
  boardKey,
  challengeKey,
  rulesVersion,
  limit = DEFAULT_LEADERBOARD_LIMIT,
}, client = getSupabaseClient()) {
  const { data, error } = await client.rpc("get_game_leaderboard", {
    p_board_key: boardKey,
    p_challenge_key: challengeKey,
    p_game_key: gameKey,
    p_limit: limit,
    p_rules_version: rulesVersion,
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
  boardKey,
  rulesVersion,
  context = {},
}, client = getSupabaseClient()) {
  assertPermanentAccount(authStatus, user);

  const { data, error } = await client.rpc("begin_ranked_game", {
    p_board_key: boardKey,
    p_context: context,
    p_game_key: gameKey,
    p_rules_version: rulesVersion,
  });
  if (error) throw error;
  if (
    !data?.attemptId
    || data.gameKey !== gameKey
    || data.boardKey !== boardKey
    || data.rulesVersion !== rulesVersion
    || typeof data.challengeKey !== "string"
  ) throw new Error("서버가 유효한 랭킹 게임 시도를 발급하지 않았습니다.");

  return {
    attemptId: data.attemptId,
    boardKey: data.boardKey,
    challengeKey: data.challengeKey,
    gameKey: data.gameKey,
    payload: data.payload && typeof data.payload === "object" ? data.payload : {},
    rulesVersion: data.rulesVersion,
    seed: data.seed ?? null,
    startedAt: data.startedAt ?? null,
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
