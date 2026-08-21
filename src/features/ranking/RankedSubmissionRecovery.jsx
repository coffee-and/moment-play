import { useEffect } from "react";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { resumeRankedResultOutbox } from "./rankedResultFinalizer.js";

export function RankedSubmissionRecovery() {
  const { status: authStatus, user } = useAuth();

  useEffect(() => {
    if (authStatus !== "authenticated" || !user) return;
    void resumeRankedResultOutbox({ authStatus, user });
  }, [authStatus, user]);

  return null;
}
