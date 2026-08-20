import { useCallback, useEffect, useRef } from "react";
import { checkpointRankedFlappy } from "../../../../infrastructure/supabase/gameResultsGateway.js";
import { useAuth } from "../../../../shared/auth/AuthContext.jsx";
import { createRandomSeed } from "../../../../shared/random/deterministicRandom.js";
import { RANKING_BOARD } from "../../../ranking/rankingRegistry.js";
import { useGameResultSubmission } from "../../../ranking/useGameResultSubmission.js";
import { FLAPPY_SIMULATION_TICK_MS } from "./flappySimulation.js";
import { FLAPPY_SESSION_MODE } from "./flappySession.js";
import {
  FLAPPY_RANKING_PROOF_VERSION,
  FLAPPY_RANKING_CHECKPOINT_LIMIT_TICKS,
  createFlappyRankingRun,
} from "./flappyRankingRun.js";

const BOARD_BY_MODE = Object.freeze({
  [FLAPPY_SESSION_MODE.COURSE]: RANKING_BOARD.STAR_FLIGHT_COURSE,
  [FLAPPY_SESSION_MODE.ENDLESS]: RANKING_BOARD.STAR_FLIGHT_ENDLESS,
});

function hasValidAttemptContract(attempt, mode) {
  const hasSharedContract = Number.isSafeInteger(attempt.seed)
    && attempt.payload?.mode === mode
    && attempt.payload?.proofVersion === FLAPPY_RANKING_PROOF_VERSION
    && attempt.payload?.tickMs === FLAPPY_SIMULATION_TICK_MS;
  if (!hasSharedContract) return false;
  return mode !== FLAPPY_SESSION_MODE.ENDLESS
    || attempt.payload?.checkpointTickLimit === FLAPPY_RANKING_CHECKPOINT_LIMIT_TICKS;
}

export function useFlappyRankingRun() {
  const { status: authStatus, user } = useAuth();
  const submission = useGameResultSubmission();
  const { invalidateAttempt, startAttempt, submitResult } = submission;
  const activeRunRef = useRef(null);
  const runGenerationRef = useRef(0);

  useEffect(() => () => {
    runGenerationRef.current += 1;
    activeRunRef.current = null;
  }, []);

  const startRun = useCallback(async (mode) => {
    runGenerationRef.current += 1;
    const generation = runGenerationRef.current;
    activeRunRef.current = null;
    const board = BOARD_BY_MODE[mode];
    if (!board) throw new Error("지원하지 않는 별빛 비행 랭킹 모드입니다.");

    const attempt = await startAttempt(board);
    if (!attempt) return null;
    if (!attempt.ranked) return { ranked: false, seed: createRandomSeed() };
    if (!hasValidAttemptContract(attempt, mode)) {
      invalidateAttempt("서버의 별빛 비행 규칙이 현재 게임과 일치하지 않아 로컬 모드로 시작합니다.");
      return { ranked: false, seed: createRandomSeed() };
    }

    activeRunRef.current = createFlappyRankingRun({
      attempt,
      onInvalidated: (message) => {
        if (runGenerationRef.current === generation) {
          invalidateAttempt(message);
        }
      },
      submitCheckpoint: (checkpoint) => checkpointRankedFlappy({
        ...checkpoint,
        authStatus,
        user,
      }),
    });
    return { ranked: true, seed: attempt.seed };
  }, [authStatus, invalidateAttempt, startAttempt, user]);

  const recordStep = useCallback((step) => {
    activeRunRef.current?.recordStep(step);
  }, []);

  const finishCourse = useCallback(async (finalSimulation) => {
    const run = activeRunRef.current;
    const proof = await run?.finishCourse(finalSimulation);
    if (proof && activeRunRef.current === run) await submitResult({ proof });
  }, [submitResult]);

  const finishEndless = useCallback(async (finalSimulation) => {
    const run = activeRunRef.current;
    const proof = await run?.finishEndless(finalSimulation);
    if (proof && activeRunRef.current === run) await submitResult({ proof });
  }, [submitResult]);

  const disqualify = useCallback((message) => {
    activeRunRef.current?.disqualify(message);
  }, []);

  return {
    disqualify,
    finishCourse,
    finishEndless,
    recordStep,
    startRun,
    submission,
  };
}
