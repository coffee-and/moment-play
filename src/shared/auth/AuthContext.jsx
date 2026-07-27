import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  getCurrentSession,
  signInWithEmail,
  signOutCurrentSession,
  signUpWithEmail,
  subscribeToAuthChanges,
} from "../../infrastructure/supabase/authGateway.js";
import { isSupabaseConfigured } from "../../infrastructure/supabase/supabaseClient.js";
import { AUTH_MESSAGES } from "./authConstants.js";
import { buildAuthCallbackUrl } from "./authRedirect.js";

const AuthContext = createContext(null);
const SESSION_EVENTS = new Set([
  "INITIAL_SESSION",
  "PASSWORD_RECOVERY",
  "SIGNED_IN",
  "SIGNED_OUT",
  "TOKEN_REFRESHED",
  "USER_UPDATED",
]);

export function AuthProvider({ children }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState(null);
  const [initialized, setInitialized] = useState(!configured);
  const sessionRef = useRef(null);
  const initializedRef = useRef(!configured);
  const sessionRevisionRef = useRef(0);

  const applySession = useCallback((nextSession) => {
    const normalizedSession = nextSession ?? null;
    if (initializedRef.current && sessionRef.current === normalizedSession) return;
    sessionRevisionRef.current += 1;
    sessionRef.current = normalizedSession;
    initializedRef.current = true;
    setSession(normalizedSession);
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!configured) return undefined;

    let mounted = true;
    const initialRevision = sessionRevisionRef.current;
    let unsubscribe = () => {};

    try {
      unsubscribe = subscribeToAuthChanges((event, nextSession) => {
        if (!mounted || !SESSION_EVENTS.has(event)) return;
        if (event === "INITIAL_SESSION" && sessionRevisionRef.current !== initialRevision) return;
        applySession(nextSession);
      });
    } catch {
      applySession(null);
    }

    getCurrentSession()
      .then((existingSession) => {
        if (!mounted || sessionRevisionRef.current !== initialRevision) return;
        applySession(existingSession);
      })
      .catch(() => {
        if (!mounted || sessionRevisionRef.current !== initialRevision) return;
        applySession(null);
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [applySession, configured]);

  const signUp = useCallback(async ({ email, password, returnTo = "/" }) => {
    if (!configured) {
      throw new Error(AUTH_MESSAGES.notConfigured);
    }
    const result = await signUpWithEmail({
      email,
      password,
      emailRedirectTo: buildAuthCallbackUrl(returnTo),
    });
    if (result.session) applySession(result.session);
    return result;
  }, [applySession, configured]);

  const signIn = useCallback(async ({ email, password }) => {
    if (!configured) {
      throw new Error(AUTH_MESSAGES.notConfigured);
    }
    const result = await signInWithEmail({ email, password });
    applySession(result.session);
    return result;
  }, [applySession, configured]);

  const signOut = useCallback(async () => {
    if (!configured) return;
    await signOutCurrentSession();
    applySession(null);
  }, [applySession, configured]);

  const refreshSession = useCallback(async () => {
    if (!configured) {
      applySession(null);
      return null;
    }
    try {
      const nextSession = await getCurrentSession();
      applySession(nextSession);
      return nextSession;
    } catch {
      applySession(null);
      return null;
    }
  }, [applySession, configured]);

  const status = initialized ? (session ? "authenticated" : "guest") : "loading";
  const value = useMemo(() => ({
    isConfigured: configured,
    refreshSession,
    signIn,
    signOut,
    signUp,
    status,
    user: session?.user ?? null,
  }), [configured, refreshSession, session, signIn, signOut, signUp, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
