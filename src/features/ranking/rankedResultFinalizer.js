import { submitGameResult } from "../../infrastructure/supabase/gameResultsGateway.js";
import {
  readRankedResultOutbox,
  removeRankedResultCommand,
  storeRankedResultCommand,
} from "./rankedResultOutbox.js";
import {
  isTransientRankedRequestError,
  retryRankedRequest,
} from "./rankedRequestRetry.js";

const inFlightByAttempt = new Map();

function createCommand({ attempt, clientSubmissionId, proof, userId }) {
  return {
    attemptId: attempt.attemptId,
    boardKey: attempt.boardKey,
    clientSubmissionId,
    createdAt: Date.now(),
    gameKey: attempt.gameKey,
    proof,
    rulesVersion: attempt.rulesVersion,
    userId,
  };
}

function processCommand(command, { authStatus, user }) {
  if (authStatus !== "authenticated" || user?.id !== command.userId) {
    return Promise.reject(new Error("랭킹 결과를 시작한 계정으로 다시 로그인해 주세요."));
  }
  const inFlightKey = `${command.userId}:${command.attemptId}`;
  const existing = inFlightByAttempt.get(inFlightKey);
  if (existing) return existing;

  const request = retryRankedRequest(() => submitGameResult({
    authStatus,
    user,
    result: {
      attemptId: command.attemptId,
      clientSubmissionId: command.clientSubmissionId,
      proof: command.proof,
    },
  })).then((result) => {
    removeRankedResultCommand(command);
    return result;
  }).catch((error) => {
    if (!isTransientRankedRequestError(error)) removeRankedResultCommand(command);
    throw error;
  }).finally(() => {
    inFlightByAttempt.delete(inFlightKey);
  });

  inFlightByAttempt.set(inFlightKey, request);
  return request;
}

export function finalizeRankedResult({
  attempt,
  authStatus,
  clientSubmissionId,
  proof,
  user,
}) {
  if (authStatus !== "authenticated" || !user?.id) {
    throw new Error("로그인해야 랭킹 기록을 저장할 수 있습니다.");
  }
  const command = storeRankedResultCommand(createCommand({
    attempt,
    clientSubmissionId,
    proof,
    userId: user.id,
  }));
  return processCommand(command, { authStatus, user });
}

export async function resumeRankedResultOutbox({
  authStatus,
  boardKey,
  gameKey,
  user,
}) {
  if (authStatus !== "authenticated" || !user?.id) return [];
  const commands = readRankedResultOutbox({ boardKey, gameKey, userId: user.id });
  const results = [];
  for (const command of commands) {
    try {
      results.push(await processCommand(command, { authStatus, user }));
    } catch (error) {
      results.push({ error });
    }
  }
  return results;
}
