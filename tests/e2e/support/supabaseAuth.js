import {
  E2E_AUTH_STORAGE_KEY,
  E2E_SUPABASE_ORIGIN,
} from "./environment.js";

const SUPABASE_CORS_HEADERS = {
  "access-control-allow-headers": "apikey, authorization, content-type, x-client-info, x-supabase-api-version",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-origin": "*",
};

function createTestSession(provider = "email") {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const encodedPayload = Buffer.from(JSON.stringify({
    exp: expiresAt,
    role: "authenticated",
    sub: "00000000-0000-4000-8000-000000000001",
  })).toString("base64url");

  return {
    access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.e2e-signature`,
    expires_at: expiresAt,
    expires_in: 60 * 60,
    refresh_token: "e2e-refresh-token",
    token_type: "bearer",
    user: {
      app_metadata: { provider, providers: [provider] },
      aud: "authenticated",
      created_at: new Date(0).toISOString(),
      email: "browser-test@example.com",
      id: "00000000-0000-4000-8000-000000000001",
      role: "authenticated",
      user_metadata: {},
    },
  };
}

export async function useAuthenticatedSession(page) {
  await page.route(`${E2E_SUPABASE_ORIGIN}/**`, (route) => route.fulfill({
    body: "[]",
    contentType: "application/json",
    status: 200,
  }));
  await page.addInitScript(({ storageKey, session }) => {
    window.localStorage.setItem(storageKey, JSON.stringify(session));
  }, { storageKey: E2E_AUTH_STORAGE_KEY, session: createTestSession() });
}

export async function emulateGoogleOAuthRoundTrip(page) {
  const oauth = {
    authorizeUrl: null,
    callbackUrl: null,
    redirectTo: null,
    tokenBody: null,
  };
  const session = createTestSession("google");

  await page.route(`${E2E_SUPABASE_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());

    if (request.method() === "OPTIONS") {
      await route.fulfill({ headers: SUPABASE_CORS_HEADERS, status: 204 });
      return;
    }

    if (requestUrl.pathname === "/auth/v1/authorize") {
      oauth.authorizeUrl = requestUrl;
      oauth.redirectTo = requestUrl.searchParams.get("redirect_to");
      oauth.callbackUrl = oauth.redirectTo ? new URL(oauth.redirectTo) : null;
      if (!oauth.callbackUrl) {
        await route.abort("failed");
        return;
      }
      oauth.callbackUrl.searchParams.set("code", "e2e-google-code");
      await route.fulfill({
        headers: { location: oauth.callbackUrl.toString() },
        status: 302,
      });
      return;
    }

    if (requestUrl.pathname === "/auth/v1/token") {
      oauth.tokenBody = request.postDataJSON();
      await route.fulfill({
        body: JSON.stringify(session),
        contentType: "application/json",
        headers: SUPABASE_CORS_HEADERS,
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: "[]",
      contentType: "application/json",
      headers: SUPABASE_CORS_HEADERS,
      status: 200,
    });
  });

  return oauth;
}
