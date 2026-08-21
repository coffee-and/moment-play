import { describe, expect, it } from "vitest";
import {
  isAllowedAdvisory,
  parseAdvisoriesOutput,
} from "./check-database-advisors.mjs";

function createRpcAdvisory(name, identity) {
  return {
    cache_key: `${name}_${identity}`,
    name,
  };
}

describe("parseAdvisoriesOutput", () => {
  it.each(["", "  \n  "])("treats a successful empty CLI response as no advisories", (output) => {
    expect(parseAdvisoriesOutput(output)).toEqual([]);
  });

  it("returns the advisory array emitted by the CLI", () => {
    const advisories = [{ name: "example", detail: "review me" }];
    expect(parseAdvisoriesOutput(JSON.stringify(advisories))).toEqual(advisories);
  });

  it.each(["{}", "null", "\"unexpected\""])("rejects a non-array JSON response", (output) => {
    expect(() => parseAdvisoriesOutput(output)).toThrow(/JSON array/);
  });

  it("rejects malformed non-empty output", () => {
    expect(() => parseAdvisoriesOutput("No issues found")).toThrow(SyntaxError);
  });
});

describe("isAllowedAdvisory", () => {
  const anonRpcAdvisory = "anon_security_definer_function_executable";
  const authenticatedRpcAdvisory = "authenticated_security_definer_function_executable";
  const leaderboardIdentity = "public_get_game_leaderboard_p_game_key text, p_board_key text, p_challenge_key text, p_rules_version text, p_limit integer";

  it.each([
    [anonRpcAdvisory, leaderboardIdentity],
    [authenticatedRpcAdvisory, "public_begin_ranked_game_p_game_key text, p_board_key text, p_rules_version text, p_context jsonb"],
    [authenticatedRpcAdvisory, "public_checkpoint_ranked_flappy_p_attempt_id uuid, p_sequence integer, p_to_tick bigint, p_flap_ticks jsonb"],
    [authenticatedRpcAdvisory, leaderboardIdentity],
  ])("allows the reviewed current RPC contract for %s", (name, identity) => {
    expect(isAllowedAdvisory(createRpcAdvisory(name, identity))).toBe(true);
  });

  it.each([
    [authenticatedRpcAdvisory, "public_begin_ranked_game_p_game_key text, p_mode text, p_context jsonb"],
    [anonRpcAdvisory, "public_get_game_leaderboard_p_game_key text, p_mode text, p_limit integer"],
    [authenticatedRpcAdvisory, `${leaderboardIdentity}, p_unreviewed boolean`],
    [anonRpcAdvisory, "public_begin_ranked_game_p_game_key text, p_board_key text, p_rules_version text, p_context jsonb"],
  ])("rejects stale, overloaded, or incorrectly exposed RPC contracts", (name, identity) => {
    expect(isAllowedAdvisory(createRpcAdvisory(name, identity))).toBe(false);
  });

  it("allows only the explicitly deferred non-RPC advisory", () => {
    expect(isAllowedAdvisory({ name: "auth_leaked_password_protection" })).toBe(true);
    expect(isAllowedAdvisory({ name: "unreviewed_security_warning" })).toBe(false);
  });
});
