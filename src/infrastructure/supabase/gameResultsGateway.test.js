import { describe, expect, it, vi } from "vitest";
import {
  beginRankedGameAttempt,
  checkpointRankedFlappy,
  fetchLeaderboard,
  ResultSubmissionNotAllowedError,
  submitGameResult,
} from "./gameResultsGateway.js";

function createClient({ beginData, checkpointData, completeData, leaderboardData = [], rpcError = null } = {}) {
  return {
    rpc: vi.fn(async (functionName) => ({
      data: functionName === "begin_ranked_game"
        ? beginData
        : functionName === "checkpoint_ranked_flappy"
          ? checkpointData
        : functionName === "complete_ranked_game"
          ? completeData
          : leaderboardData,
      error: rpcError,
    })),
  };
}

const authenticatedUser = { id: "user-1" };
const result = {
  attemptId: "22222222-2222-4222-8222-222222222222",
  clientSubmissionId: "11111111-1111-4111-8111-111111111111",
  proof: { moves: ["left", "up"] },
};

describe("gameResultsGateway", () => {
  it("does not begin or submit ranked attempts for guests", async () => {
    const client = createClient();
    const account = { authStatus: "guest", user: null };

    await expect(beginRankedGameAttempt({
      ...account,
      gameKey: "2048",
    }, client)).rejects.toBeInstanceOf(ResultSubmissionNotAllowedError);
    await expect(submitGameResult({ ...account, result }, client))
      .rejects.toBeInstanceOf(ResultSubmissionNotAllowedError);
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("begins a server-owned attempt without accepting a caller-supplied owner", async () => {
    const attempt = {
      attemptId: result.attemptId,
      boardKey: "easy",
      challengeKey: "all-time",
      gameKey: "sudoku",
      payload: {
        proofVersion: 2,
        puzzleId: "ocean-01-shift",
        puzzle: "000000010002195300198000567009761423026053701700020856000000084280019030300286070",
      },
      rulesVersion: "1",
      startedAt: "2026-08-16T00:00:00Z",
    };
    const client = createClient({ beginData: attempt });

    await expect(beginRankedGameAttempt({
      authStatus: "authenticated",
      user: authenticatedUser,
      gameKey: "sudoku",
      boardKey: "easy",
      rulesVersion: "1",
      userId: "other-user",
    }, client)).resolves.toEqual({
      ...attempt,
      seed: null,
    });

    expect(client.rpc).toHaveBeenCalledWith("begin_ranked_game", {
      p_board_key: "easy",
      p_context: {},
      p_game_key: "sudoku",
      p_rules_version: "1",
    });
  });

  it("submits only the attempt identifiers and replay proof to the completion RPC", async () => {
    const client = createClient({ completeData: { duplicate: false, metrics: { score: 4096 } } });
    await submitGameResult({
      authStatus: "authenticated",
      user: authenticatedUser,
      result: { ...result, metrics: { score: 999999 }, userId: "other-user" },
    }, client);

    expect(client.rpc).toHaveBeenCalledWith("complete_ranked_game", {
      p_attempt_id: result.attemptId,
      p_client_submission_id: result.clientSubmissionId,
      p_proof: result.proof,
    });
  });

  it("preserves the server's idempotent duplicate response", async () => {
    const client = createClient({ completeData: { duplicate: true, metrics: { score: 4096 } } });
    await expect(submitGameResult({
      authStatus: "authenticated",
      user: authenticatedUser,
      result,
    }, client)).resolves.toEqual({ duplicate: true, metrics: { score: 4096 } });
  });

  it("submits a bounded Star Flight checkpoint without client-owned metrics", async () => {
    const checkpoint = {
      checkpointSequence: 3,
      metrics: { endlessGates: 9, endlessScore: 220, survivalMs: 60_000 },
      status: "flying",
      tick: 3_000,
    };
    const client = createClient({ checkpointData: checkpoint });

    await expect(checkpointRankedFlappy({
      authStatus: "authenticated",
      user: authenticatedUser,
      attemptId: result.attemptId,
      flapTicks: [2_850, 2_920],
      sequence: 3,
      toTick: 3_000,
    }, client)).resolves.toEqual(checkpoint);

    expect(client.rpc).toHaveBeenCalledWith("checkpoint_ranked_flappy", {
      p_attempt_id: result.attemptId,
      p_flap_ticks: [2_850, 2_920],
      p_sequence: 3,
      p_to_tick: 3_000,
    });
  });

  it("maps only public leaderboard fields and drops private response properties", async () => {
    const client = createClient({
      leaderboardData: [{
        rank: 1,
        nickname: "Sky",
        game_key: "2048",
        board_key: "classic",
        challenge_key: "all-time",
        rules_version: "1",
        metrics: { score: 8192 },
        created_at: "2026-07-14T00:00:00Z",
        is_current_user: true,
        email: "private@example.com",
        user_id: "private-user-id",
      }],
    });
    const [entry] = await fetchLeaderboard({
      boardKey: "classic",
      challengeKey: "all-time",
      gameKey: "2048",
      rulesVersion: "1",
    }, client);
    expect(entry).not.toHaveProperty("email");
    expect(entry).not.toHaveProperty("userId");
    expect(entry.nickname).toBe("Sky");
    expect(entry.metrics).toEqual({ score: 8192 });
  });
});
