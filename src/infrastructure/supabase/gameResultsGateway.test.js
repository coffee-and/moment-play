import { describe, expect, it, vi } from "vitest";
import {
  beginRankedGameAttempt,
  fetchLeaderboard,
  ResultSubmissionNotAllowedError,
  submitGameResult,
} from "./gameResultsGateway.js";

function createClient({ beginData, completeData, leaderboardData = [], rpcError = null } = {}) {
  return {
    rpc: vi.fn(async (functionName) => ({
      data: functionName === "begin_ranked_game"
        ? beginData
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
      seed: 1234,
      startedAt: "2026-08-16T00:00:00Z",
    };
    const client = createClient({ beginData: attempt });

    await expect(beginRankedGameAttempt({
      authStatus: "authenticated",
      user: authenticatedUser,
      gameKey: "sudoku",
      mode: "easy",
      context: { puzzleId: "ocean-01" },
      userId: "other-user",
    }, client)).resolves.toEqual(attempt);

    expect(client.rpc).toHaveBeenCalledWith("begin_ranked_game", {
      p_game_key: "sudoku",
      p_mode: "easy",
      p_context: { puzzleId: "ocean-01" },
    });
  });

  it("submits only the attempt identifiers and replay proof to the completion RPC", async () => {
    const client = createClient({ completeData: { duplicate: false, scoreValue: 4096 } });
    await submitGameResult({
      authStatus: "authenticated",
      user: authenticatedUser,
      result: { ...result, scoreValue: 999999, userId: "other-user" },
    }, client);

    expect(client.rpc).toHaveBeenCalledWith("complete_ranked_game", {
      p_attempt_id: result.attemptId,
      p_client_submission_id: result.clientSubmissionId,
      p_proof: result.proof,
    });
  });

  it("preserves the server's idempotent duplicate response", async () => {
    const client = createClient({ completeData: { duplicate: true, scoreValue: 4096 } });
    await expect(submitGameResult({
      authStatus: "authenticated",
      user: authenticatedUser,
      result,
    }, client)).resolves.toEqual({ duplicate: true, scoreValue: 4096 });
  });

  it("maps only public leaderboard fields and drops private response properties", async () => {
    const client = createClient({
      leaderboardData: [{
        rank: 1,
        nickname: "Sky",
        game_key: "2048",
        mode: null,
        score_value: 8192,
        duration_ms: null,
        match_result: null,
        created_at: "2026-07-14T00:00:00Z",
        is_current_user: true,
        email: "private@example.com",
        user_id: "private-user-id",
      }],
    });
    const [entry] = await fetchLeaderboard({ gameKey: "2048" }, client);
    expect(entry).not.toHaveProperty("email");
    expect(entry).not.toHaveProperty("userId");
    expect(entry.nickname).toBe("Sky");
  });
});
