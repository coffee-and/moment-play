import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getExistingSession } from "../../infrastructure/supabase/supabaseAuth.js";
import { getSupabaseClient, isSupabaseConfigured } from "../../infrastructure/supabase/supabaseClient.js";
import { AUTH_MESSAGES, COMPLETE_SIGNUP_PATH } from "./authConstants.js";

const AuthContext = createContext(null);
const SESSION_EVENTS = new Set(["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED", "TOKEN_REFRESHED"]);

function deriveStatus(session) {
  if (!session) return "guest";
  return session.user.is_anonymous ? "anonymous" : "authenticated";
}

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && typeof error.message === "string") return error.message;
  return fallbackMessage;
}

// Supabase doesn't expose a single stable error code for "email taken" across
// every code path (signUp vs. updateUser-linking), so this matches on the
// documented message text as a best-effort classifier.
function isEmailAlreadyRegisteredError(error) {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();
  return (
    code === "email_exists" ||
    code === "user_already_exists" ||
    (message.includes("already") && (message.includes("registered") || message.includes("exists")))
  );
}

function getEmailRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}#${COMPLETE_SIGNUP_PATH}`;
}

// Initial session reads never create an anonymous session, so mounting the
// provider does not make login mandatory for guest play.
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

  const status = initialized ? deriveStatus(session) : "loading";

  useEffect(() => {
    if (!configured) return undefined;

    let mounted = true;
    const client = getSupabaseClient();
    const initialRevision = sessionRevisionRef.current;

    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted || !SESSION_EVENTS.has(event)) return;
      if (event === "INITIAL_SESSION" && sessionRevisionRef.current !== initialRevision) return;
      applySession(nextSession);
    });

    getExistingSession(client)
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
      listener.subscription.unsubscribe();
    };
  }, [applySession, configured]);

  // Plain new-account signup (the caller is a guest with no anonymous
  // session at all). Email+password together is the standard, safe Supabase
  // signUp contract here - this is NOT the anonymous-linking hazard case, so
  // it deliberately refuses to run against an anonymous session instead of
  // silently abandoning it (see linkEmail/completeAccountUpgrade below for
  // that path).
  const signUp = useCallback(
    async ({ email, password }) => {
      if (!configured) throw new Error(AUTH_MESSAGES.notConfigured);
      if (session?.user?.is_anonymous) throw new Error(AUTH_MESSAGES.useLinkEmailInstead);

      const client = getSupabaseClient();
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) {
        if (isEmailAlreadyRegisteredError(error)) throw new Error(AUTH_MESSAGES.emailAlreadyRegistered);
        throw new Error(getErrorMessage(error, AUTH_MESSAGES.signUpFailed));
      }
      if (data.session) applySession(data.session);
      return { user: data.user, session: data.session ?? null };
    },
    [applySession, configured, session],
  );

  const signIn = useCallback(
    async ({ email, password }) => {
      if (!configured) throw new Error(AUTH_MESSAGES.notConfigured);
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(getErrorMessage(error, AUTH_MESSAGES.signInFailed));
      if (!data.session) throw new Error(AUTH_MESSAGES.signInFailed);
      applySession(data.session);
      return { user: data.user, session: data.session };
    },
    [applySession, configured],
  );

  const signOut = useCallback(async () => {
    if (!configured) return;
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) throw new Error(getErrorMessage(error, AUTH_MESSAGES.signOutFailed));
    applySession(null);
  }, [applySession, configured]);

  // Step 1 of the anonymous -> permanent upgrade. Attaches an email address
  // to the current anonymous user WITHOUT a password - Supabase requires
  // "manual linking" enabled for this call to succeed on an anonymous user,
  // and only supports adding one identity at a time here (see
  // docs/omok-online-setup.md for the required dashboard settings). No
  // password exists yet at this point, so there is nothing to hold in memory
  // or persist.
  const linkEmail = useCallback(
    async ({ email }) => {
      if (!configured) throw new Error(AUTH_MESSAGES.notConfigured);
      if (!session?.user?.is_anonymous) throw new Error(AUTH_MESSAGES.linkEmailRequiresAnonymous);

      const client = getSupabaseClient();
      const { data, error } = await client.auth.updateUser(
        { email },
        { emailRedirectTo: getEmailRedirectUrl() },
      );
      if (error) {
        if (isEmailAlreadyRegisteredError(error)) throw new Error(AUTH_MESSAGES.emailAlreadyRegistered);
        throw new Error(getErrorMessage(error, AUTH_MESSAGES.linkEmailFailed));
      }
      return { user: data.user };
    },
    [configured, session],
  );

  // Step 2 - only does anything once the email above has actually been
  // verified. `status` only becomes "authenticated" after Supabase itself
  // flips the user's is_anonymous flag to false server-side (which happens
  // when the email identity is verified, either via the confirmation link or
  // immediately if email confirmation is disabled project-wide) - this
  // re-checks that live status rather than trusting the caller.
  const completeAccountUpgrade = useCallback(
    async ({ password }) => {
      if (!configured) throw new Error(AUTH_MESSAGES.notConfigured);
      if (status !== "authenticated") throw new Error(AUTH_MESSAGES.notYetVerified);

      const client = getSupabaseClient();
      const { data, error } = await client.auth.updateUser({ password });
      if (error) throw new Error(getErrorMessage(error, AUTH_MESSAGES.completeUpgradeFailed));
      return { user: data.user };
    },
    [configured, status],
  );

  // Exchanges the PKCE `code` query param Supabase appends to the
  // emailRedirectTo link (see getEmailRedirectUrl above) for a session, when
  // the user returns to the app via that link. A successful exchange itself
  // fires onAuthStateChange with the refreshed (now-verified) session, which
  // updates `status` above the normal way - no separate verified flag needed.
  const completeEmailVerification = useCallback(
    async (code) => {
      if (!configured) throw new Error(AUTH_MESSAGES.notConfigured);
      const client = getSupabaseClient();
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw new Error(getErrorMessage(error, AUTH_MESSAGES.verifyCodeFailed));
      if (data.session) applySession(data.session);
    },
    [applySession, configured],
  );

  // Re-reads the current session from Supabase. Used when the user verifies
  // their email in a different tab/device and returns to this one without
  // any auth event having fired here on its own.
  const refreshSession = useCallback(async () => {
    if (!configured) return;
    const client = getSupabaseClient();
    const existingSession = await getExistingSession(client);
    applySession(existingSession);
  }, [applySession, configured]);

  const value = useMemo(
    () => ({
      isConfigured: configured,
      status,
      user: session?.user ?? null,
      completeAccountUpgrade,
      completeEmailVerification,
      linkEmail,
      refreshSession,
      signIn,
      signOut,
      signUp,
    }),
    [completeAccountUpgrade, completeEmailVerification, configured, linkEmail, refreshSession, session, signIn, signOut, signUp, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
