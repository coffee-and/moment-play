import { AUTH_MESSAGES } from "../../shared/auth/authConstants.js";
import { getSupabaseClient } from "./supabaseClient.js";

const EMAIL_CONFLICT_CODES = new Set(["email_exists", "user_already_exists"]);
const VERIFICATION_ERROR_CODES = new Set([
  "bad_code_verifier",
  "flow_state_expired",
  "flow_state_not_found",
  "otp_expired",
]);

export class AuthGatewayError extends Error {
  constructor(message, { cause, code } = {}) {
    super(message, { cause });
    this.name = "AuthGatewayError";
    this.code = code ?? null;
  }
}

export function normalizeAuthError(error, fallbackMessage) {
  if (error instanceof AuthGatewayError) return error;

  const code = typeof error?.code === "string" ? error.code : null;
  const rawMessage = typeof error?.message === "string" ? error.message : "";
  const lowerMessage = rawMessage.toLowerCase();

  if (
    EMAIL_CONFLICT_CODES.has(code)
    || (lowerMessage.includes("already") && (lowerMessage.includes("registered") || lowerMessage.includes("exists")))
  ) {
    return new AuthGatewayError(AUTH_MESSAGES.emailAlreadyRegistered, { cause: error, code });
  }
  if (VERIFICATION_ERROR_CODES.has(code)) {
    return new AuthGatewayError(AUTH_MESSAGES.verifyCodeFailed, { cause: error, code });
  }

  return new AuthGatewayError(rawMessage || fallbackMessage, { cause: error, code });
}

function isReleaseSession(session) {
  if (!session?.user || session.user.is_anonymous === true) return false;
  if (typeof session.expires_at === "number" && session.expires_at <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  return true;
}

export async function getCurrentSession(client = getSupabaseClient()) {
  const { data, error } = await client.auth.getSession();
  if (error) throw normalizeAuthError(error, AUTH_MESSAGES.sessionRestoreFailed);
  if (data.session?.user?.is_anonymous === true) {
    await client.auth.signOut({ scope: "local" });
  }
  return isReleaseSession(data.session) ? data.session : null;
}

export async function requireAuthenticatedSession(client = getSupabaseClient()) {
  const session = await getCurrentSession(client);
  if (!session) throw new AuthGatewayError(AUTH_MESSAGES.authenticationRequired);
  return session;
}

export function subscribeToAuthChanges(callback, client = getSupabaseClient()) {
  const { data } = client.auth.onAuthStateChange((event, session) => {
    callback(event, isReleaseSession(session) ? session : null);
  });
  return () => data.subscription.unsubscribe();
}

export async function signUpWithEmail({ email, password, emailRedirectTo }, client = getSupabaseClient()) {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
  if (error) throw normalizeAuthError(error, AUTH_MESSAGES.signUpFailed);
  return { session: isReleaseSession(data.session) ? data.session : null, user: data.user ?? null };
}

export async function signInWithEmail({ email, password }, client = getSupabaseClient()) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw normalizeAuthError(error, AUTH_MESSAGES.signInFailed);
  if (!isReleaseSession(data.session)) throw new AuthGatewayError(AUTH_MESSAGES.signInFailed);
  return { session: data.session, user: data.user ?? data.session.user };
}

export async function signOutCurrentSession(client = getSupabaseClient()) {
  const { error } = await client.auth.signOut();
  if (error) throw normalizeAuthError(error, AUTH_MESSAGES.signOutFailed);
}

export async function exchangeAuthCode(code, client = getSupabaseClient()) {
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error) throw normalizeAuthError(error, AUTH_MESSAGES.verifyCodeFailed);
  if (!isReleaseSession(data.session)) throw new AuthGatewayError(AUTH_MESSAGES.verifyCodeFailed);
  return data.session;
}
