import { useCallback, useEffect, useRef, useState } from "react";
import { checkpointRankedFlappy } from "../../../../infrastructure/supabase/gameResultsGateway.js";
import { useAuth } from "../../../../shared/auth/AuthContext.jsx";
import { createRandomSeed } from "../../../../shared/random/deterministicRandom.js";
import { RANKING_BOARD } from "../../../ranking/rankingRegistry.js";
import { useGameResultSubmission } from "../../../ranking/useGameResultSubmission.js";
import { retryRankedRequest } from "../../../ranking/rankedRequestRetry.js";
import { FLAPPY_CONFIG } from "./flappyConfig.js";
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
    && attempt.payload?.tickMs === FLAPPY_CONFIG.simulationTickMs;
  if (!hasSharedContract) return false;
  return mode !== FLAPPY_SESSION_MODE.ENDLESS
    || attempt.payload?.checkpointTickLimit === FLAPPY_RANKING_CHECKPOINT_LIMIT_TICKS;
}

export function useFlappyRankingRun() {
  const { status: authStatus, user } = useAuth();
  const submission = useGameResultSubmission();
  const { invalidateAttempt, startAttempt, submitResult } = submission;
  const [isFinalizing, setIsFinalizing] = useState(false);
  const activeRunRef = useRef(null);
  const mountedRef = useRef(true);
  const runGenerationRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeRunRef.current = null;
    };
  }, []);

  const startRun = useCallback(async (mode) => {
    runGenerationRef.current += 1;
    const generation = runGenerationRef.current;
    activeRunRef.current = null;
    setIsFinalizing(false);
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
      submitCheckpoint: (checkpoint) => retryRankedRequest(
        () => checkpointRankedFlappy({
          ...checkpoint,
          authStatus,
          user,
        }),
      ),
    });
    return { ranked: true, seed: attempt.seed };
  }, [authStatus, invalidateAttempt, startAttempt, user]);

  const recordStep = useCallback((step) => {
    activeRunRef.current?.recordStep(step);
  }, []);

  const finishCourse = useCallback(async (finalSimulation) => {
    const run = activeRunRef.current;
    if (!run) return;
    const generation = runGenerationRef.current;
    setIsFinalizing(true);
    try {
      const proof = await run.finishCourse(finalSimulation);
      if (proof && runGenerationRef.current === generation) await submitResult({ proof });
    } finally {
      if (mountedRef.current && runGenerationRef.current === generation) setIsFinalizing(false);
    }
  }, [submitResult]);

  const finishEndless = useCallback(async (finalSimulation) => {
    const run = activeRunRef.current;
    if (!run) return;
    const generation = runGenerationRef.current;
    setIsFinalizing(true);
    try {
      const proof = await run.finishEndless(finalSimulation);
      if (proof && runGenerationRef.current === generation) await submitResult({ proof });
    } finally {
      if (mountedRef.current && runGenerationRef.current === generation) setIsFinalizing(false);
    }
  }, [submitResult]);

  const disqualify = useCallback((message) => {
    activeRunRef.current?.disqualify(message);
  }, []);

  const rankingSubmission = {
    ...submission,
    isBusy: isFinalizing || submission.isSaving || submission.isStarting,
    isFinalizing,
  };

  return {
    disqualify,
    finishCourse,
    finishEndless,
    recordStep,
    startRun,
    submission: rankingSubmission,
  };
}
