import { describe, expect, it, vi } from "vitest";
import {
  fetchLeaderboard,
  ResultSubmissionNotAllowedError,
  submitGameResult,
} from "./gameResultsGateway.js";

function createClient({ insertError = null, rpcData = [] } = {}) {
  const insert = vi.fn(async () => ({ error: insertError }));
  return {
    from: vi.fn(() => ({ insert })),
    insert,
    rpc: vi.fn(async () => ({ data: rpcData, error: null })),
  };
}

const result = {
  gameKey: "2048",
  scoreValue: 4096,
  clientSubmissionId: "11111111-1111-4111-8111-111111111111",
};

describe("gameResultsGateway", () => {
  it.each([
    ["guest", null],
    ["anonymous", { id: "anon-1", is_anonymous: true }],
  ])("does not submit server results for %s users", async (authStatus, user) => {
    const client = createClient();
    await expect(submitGameResult({ authStatus, user, result }, client)).rejects.toBeInstanceOf(ResultSubmissionNotAllowedError);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("derives user_id from the authenticated user instead of accepting a caller-supplied owner", async () => {
    const client = createClient();
    await submitGameResult({
      authStatus: "authenticated",
      user: { id: "user-1", is_anonymous: false },
      result: { ...result, userId: "other-user" },
    }, client);

    expect(client.from).toHaveBeenCalledWith("game_results");
    expect(client.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1" }));
    expect(client.insert.mock.calls[0][0]).not.toHaveProperty("userId");
  });

  it("treats a duplicate client submission identifier as an already-saved result", async () => {
    const client = createClient({ insertError: { code: "23505", message: "duplicate" } });
    await expect(submitGameResult({
      authStatus: "authenticated",
      user: { id: "user-1", is_anonymous: false },
      result,
    }, client)).resolves.toEqual({ duplicate: true });
  });

  it("maps only public leaderboard fields and drops private response properties", async () => {
    const client = createClient({
      rpcData: [{
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
