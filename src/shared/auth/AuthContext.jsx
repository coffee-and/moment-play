import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getExistingSession } from "../../infrastructure/supabase/supabaseAuth.js";
import { getSupabaseClient, isSupabaseConfigured } from "../../infrastructure/supabase/supabaseClient.js";

const AuthContext = createContext(null);

function deriveStatus(session) {
  if (!session) return "guest";
  return session.user.is_anonymous ? "anonymous" : "authenticated";
}

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && typeof error.message === "string") return error.message;
  return fallbackMessage;
}

// App-wide real-account auth session (email/password), separate from the
// existing anonymous Omok online-room flow (see useOmokOnlineRoom.js /
// omokOnlineRoomGateway.js), which keeps using ensureAnonymousSession()
// directly and is untouched by this provider. This provider only ever reads
// the current session (getExistingSession) and subscribes to changes - it
// never creates a session itself, so guest browsing of every game is
// unaffected by mounting it.
export function AuthProvider({ children }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState(configured ? "loading" : "guest");

  useEffect(() => {
    if (!configured) return undefined;

    let mounted = true;
    const client = getSupabaseClient();

    getExistingSession(client)
      .then((existingSession) => {
        if (!mounted) return;
        setSession(existingSession);
        setStatus(deriveStatus(existingSession));
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("guest");
      });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setStatus(deriveStatus(nextSession));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [configured]);

  const signUp = useCallback(
    async ({ email, password }) => {
      if (!configured) throw new Error("Supabase가 설정되지 않아 회원가입을 사용할 수 없습니다.");
      const client = getSupabaseClient();

      // An in-progress anonymous session (e.g. from the Omok online-room flow)
      // is upgraded in place via updateUser, preserving the same user_id so
      // that anonymous history carries over - rather than creating a second,
      // disconnected account via signUp.
      if (session?.user?.is_anonymous) {
        const { data, error } = await client.auth.updateUser({ email, password });
        if (error) throw new Error(getErrorMessage(error, "회원가입에 실패했습니다."));
        return { user: data.user, session };
      }

      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw new Error(getErrorMessage(error, "회원가입에 실패했습니다."));
      return { user: data.user, session: data.session ?? null };
    },
    [configured, session],
  );

  const signIn = useCallback(
    async ({ email, password }) => {
      if (!configured) throw new Error("Supabase가 설정되지 않아 로그인을 사용할 수 없습니다.");
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(getErrorMessage(error, "이메일 또는 비밀번호가 올바르지 않습니다."));
      return { user: data.user, session: data.session };
    },
    [configured],
  );

  const signOut = useCallback(async () => {
    if (!configured) return;
    const client = getSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) throw new Error(getErrorMessage(error, "로그아웃에 실패했습니다."));
  }, [configured]);

  const value = useMemo(
    () => ({
      isConfigured: configured,
      status,
      user: session?.user ?? null,
      signIn,
      signOut,
      signUp,
    }),
    [configured, session, signIn, signOut, signUp, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
