import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ALLOWED_AUTHENTICATED_RPC_IDENTITIES = new Set([
  "public_begin_ranked_game_p_game_key text, p_mode text, p_context jsonb",
  "public_cancel_friend_omok_invite_p_invite_id uuid",
  "public_cancel_friend_request_p_friendship_id uuid",
  "public_complete_ranked_game_p_attempt_id uuid, p_client_submission_id uuid, p_proof jsonb",
  "public_create_friend_omok_invite_p_friendship_id uuid, p_game_mode text, p_show_forbidden_positions boolean, p_explain_forbidden_reasons boolean, p_allow_forbidden_positions boolean, p_allow_forbidden_reasons boolean",
  "public_find_friend_by_code_p_friend_code text",
  "public_get_friend_omok_invites_",
  "public_get_friend_overview_",
  "public_get_game_leaderboard_p_game_key text, p_mode text, p_limit integer",
  "public_get_my_friend_profile_",
  "public_omok_accept_rematch_p_room_id uuid",
  "public_omok_cancel_rematch_p_room_id uuid",
  "public_omok_create_room_p_game_mode text, p_show_forbidden_positions boolean, p_explain_forbidden_reasons boolean, p_allow_forbidden_positions boolean, p_allow_forbidden_reasons boolean",
  "public_omok_is_room_member_target_room_id uuid",
  "public_omok_join_room_p_room_id uuid",
  "public_omok_leave_room_p_room_id uuid",
  "public_omok_request_rematch_p_room_id uuid",
  "public_omok_start_room_p_room_id uuid",
  "public_omok_submit_move_p_room_id uuid, p_round_number integer, p_move_number integer, p_row_index integer, p_col_index integer, p_stone text",
  "public_omok_update_player_guide_preferences_p_room_id uuid, p_show_forbidden_positions boolean, p_explain_forbidden_reasons boolean",
  "public_omok_update_room_settings_p_room_id uuid, p_game_mode text, p_allow_forbidden_positions boolean, p_allow_forbidden_reasons boolean",
  "public_remove_friend_p_friendship_id uuid",
  "public_respond_friend_omok_invite_p_invite_id uuid, p_action text",
  "public_respond_friend_request_p_friendship_id uuid, p_action text",
  "public_send_friend_request_p_friend_code text",
  "public_update_my_profile_nickname_p_nickname text",
]);

const ANON_LEADERBOARD_IDENTITY = "public_get_game_leaderboard_p_game_key text, p_mode text, p_limit integer";

function runAdvisors() {
  const cliEntry = resolve("node_modules", "supabase", "dist", "supabase.js");
  const target = process.env.SUPABASE_ADVISOR_TARGET === "linked" ? "--linked" : "--local";
  const args = [cliEntry, "db", "advisors", target, "--type", "security", "--level", "warn", "--fail-on", "none", "--output", "json"];

  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "inherit"] });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Supabase advisors exited with code ${code}.`));
        return;
      }
      resolvePromise(output);
    });
  });
}

function isAllowedAdvisory(advisory) {
  const rpcIdentity = advisory.cache_key?.slice(advisory.name.length + 1);

  if (advisory.name === "anon_security_definer_function_executable") {
    return rpcIdentity === ANON_LEADERBOARD_IDENTITY;
  }

  if (advisory.name === "authenticated_security_definer_function_executable") {
    return ALLOWED_AUTHENTICATED_RPC_IDENTITIES.has(rpcIdentity);
  }

  // This paid-plan control remains explicitly deferred; all other warnings fail the gate.
  return advisory.name === "auth_leaked_password_protection";
}

export function parseAdvisoriesOutput(rawOutput) {
  const normalizedOutput = rawOutput.trim();
  if (!normalizedOutput) return [];

  const advisories = JSON.parse(normalizedOutput);
  if (!Array.isArray(advisories)) {
    throw new TypeError("Supabase advisors must return a JSON array.");
  }

  return advisories;
}

async function main() {
  const advisories = parseAdvisoriesOutput(await runAdvisors());
  const unexpectedAdvisories = advisories.filter((advisory) => !isAllowedAdvisory(advisory));

  if (unexpectedAdvisories.length > 0) {
    console.error("Unexpected Supabase security advisories:");
    for (const advisory of unexpectedAdvisories) {
      console.error(`- ${advisory.name}: ${advisory.detail}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Supabase security advisors: ${advisories.length} reviewed warning(s), no unapproved findings.`);
  }
}

const entryPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (import.meta.url === entryPath) {
  await main();
}
