import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import {
  beginRankedGameAttempt,
} from "../../infrastructure/supabase/gameResultsGateway.js";
import {
  finalizeRankedResult,
  resumeRankedResultOutbox,
} from "./rankedResultFinalizer.js";
import { isTransientRankedRequestError } from "./rankedRequestRetry.js";

export const RESULT_SUBMISSION_STATUS = {
  IDLE: "idle",
  UNAUTHENTICATED: "unauthenticated",
  STARTING: "starting",
  SAVING: "saving",
  SAVED: "saved",
  ERROR: "error",
};

function createSubmissionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function useGameResultSubmission() {
  const { status: authStatus, user } = useAuth();
  const [status, setStatus] = useState(RESULT_SUBMISSION_STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState("");
  const submissionIdRef = useRef(createSubmissionId());
  const attemptRef = useRef(null);
  const pendingResultRef = useRef(null);
  const startPromiseRef = useRef(null);
  const submittedIdsRef = useRef(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startAttempt = useCallback(({ gameKey, boardKey, rulesVersion, context = {} }) => {
    if (startPromiseRef.current) return startPromiseRef.current;

    const startPromise = (async () => {
      submissionIdRef.current = createSubmissionId();
      attemptRef.current = null;
      pendingResultRef.current = null;
      setErrorMessage("");

      if (authStatus !== "authenticated" || !user) {
        setStatus(RESULT_SUBMISSION_STATUS.UNAUTHENTICATED);
        return { ranked: false, seed: null };
      }

      setStatus(RESULT_SUBMISSION_STATUS.STARTING);
      try {
        const recoveredResults = await resumeRankedResultOutbox({
          authStatus,
          boardKey,
          gameKey,
          user,
        });
        const pendingFailure = recoveredResults.find((result) => (
          result?.error && isTransientRankedRequestError(result.error)
        ));
        if (pendingFailure) throw pendingFailure.error;
        const attempt = await beginRankedGameAttempt({
          authStatus,
          user,
          gameKey,
          boardKey,
          rulesVersion,
          context,
        });
        if (!mountedRef.current) return null;
        attemptRef.current = attempt;
        setStatus(RESULT_SUBMISSION_STATUS.IDLE);
        return { ...attempt, ranked: true };
      } catch (error) {
        if (!mountedRef.current) return null;
        setStatus(RESULT_SUBMISSION_STATUS.ERROR);
        setErrorMessage(error?.message || "랭킹 게임 시도를 시작하지 못했습니다.");
        return { ranked: false, seed: null };
      }
    })();

    startPromiseRef.current = startPromise.finally(() => {
      startPromiseRef.current = null;
    });
    return startPromiseRef.current;
  }, [authStatus, user]);

  const save = useCallback(async (result) => {
    const clientSubmissionId = submissionIdRef.current;
    if (submittedIdsRef.current.has(clientSubmissionId)) return;
    pendingResultRef.current = result;

    if (authStatus !== "authenticated" || !user) {
      setStatus(RESULT_SUBMISSION_STATUS.UNAUTHENTICATED);
      return;
    }
    if (!attemptRef.current) {
      setStatus(RESULT_SUBMISSION_STATUS.ERROR);
      setErrorMessage("검증 가능한 랭킹 게임 시도가 없어 기록을 저장하지 않았습니다.");
      return;
    }

    submittedIdsRef.current.add(clientSubmissionId);
    setStatus(RESULT_SUBMISSION_STATUS.SAVING);
    setErrorMessage("");
    try {
      await finalizeRankedResult({
        attempt: attemptRef.current,
        authStatus,
        clientSubmissionId,
        proof: result.proof,
        user,
      });
      if (!mountedRef.current) return;
      setStatus(RESULT_SUBMISSION_STATUS.SAVED);
    } catch (error) {
      submittedIdsRef.current.delete(clientSubmissionId);
      if (!mountedRef.current) return;
      setStatus(RESULT_SUBMISSION_STATUS.ERROR);
      setErrorMessage(error?.message || "랭킹 기록을 저장하지 못했습니다.");
    }
  }, [authStatus, user]);

  const retry = useCallback(() => {
    if (!pendingResultRef.current) return;
    void save(pendingResultRef.current);
  }, [save]);

  const invalidateAttempt = useCallback((message) => {
    attemptRef.current = null;
    pendingResultRef.current = null;
    setStatus(RESULT_SUBMISSION_STATUS.ERROR);
    setErrorMessage(message || "공식 랭킹 조건을 벗어나 로컬 기록으로 계속합니다.");
  }, []);

  return {
    canRetry: Boolean(pendingResultRef.current && attemptRef.current),
    errorMessage,
    isStarting: status === RESULT_SUBMISSION_STATUS.STARTING,
    isSaving: status === RESULT_SUBMISSION_STATUS.SAVING,
    invalidateAttempt,
    retry,
    startAttempt,
    status,
    submitResult: save,
  };
}
