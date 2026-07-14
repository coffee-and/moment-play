import { useCallback, useRef, useState } from "react";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { submitGameResult } from "../../infrastructure/supabase/gameResultsGateway.js";

export const RESULT_SUBMISSION_STATUS = {
  IDLE: "idle",
  UNAUTHENTICATED: "unauthenticated",
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
  const pendingResultRef = useRef(null);
  const submittedIdsRef = useRef(new Set());

  const startAttempt = useCallback(() => {
    submissionIdRef.current = createSubmissionId();
    pendingResultRef.current = null;
    setStatus(RESULT_SUBMISSION_STATUS.IDLE);
    setErrorMessage("");
  }, []);

  const save = useCallback(async (result) => {
    const clientSubmissionId = submissionIdRef.current;
    if (submittedIdsRef.current.has(clientSubmissionId)) return;
    pendingResultRef.current = result;

    if (authStatus !== "authenticated" || !user || user.is_anonymous) {
      setStatus(RESULT_SUBMISSION_STATUS.UNAUTHENTICATED);
      return;
    }

    submittedIdsRef.current.add(clientSubmissionId);
    setStatus(RESULT_SUBMISSION_STATUS.SAVING);
    setErrorMessage("");
    try {
      await submitGameResult({
        authStatus,
        user,
        result: { ...result, clientSubmissionId },
      });
      setStatus(RESULT_SUBMISSION_STATUS.SAVED);
    } catch (error) {
      submittedIdsRef.current.delete(clientSubmissionId);
      setStatus(RESULT_SUBMISSION_STATUS.ERROR);
      setErrorMessage(error?.message || "랭킹 기록을 저장하지 못했습니다.");
    }
  }, [authStatus, user]);

  const retry = useCallback(() => {
    if (!pendingResultRef.current) return;
    void save(pendingResultRef.current);
  }, [save]);

  return { errorMessage, retry, startAttempt, status, submitResult: save };
}
