import { useCallback, useRef, useState } from "react";
import { AUTH_MESSAGES } from "./authConstants.js";

export function useSignOutAction(signOut) {
  const inFlightRef = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const runSignOut = useCallback(async () => {
    if (inFlightRef.current) return false;

    inFlightRef.current = true;
    setIsSigningOut(true);
    setErrorMessage("");

    try {
      await signOut();
      return true;
    } catch {
      setErrorMessage(AUTH_MESSAGES.signOutFailed);
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSigningOut(false);
    }
  }, [signOut]);

  return { errorMessage, isSigningOut, runSignOut };
}
