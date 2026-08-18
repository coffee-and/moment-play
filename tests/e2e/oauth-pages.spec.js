import { expect, test } from "@playwright/test";
import { E2E_APP_BASE_PATH } from "./support/environment.js";
import { emulateGoogleOAuthRoundTrip } from "./support/supabaseAuth.js";

test("Google OAuth preserves the GitHub Pages base path through the PKCE callback", async ({ page }) => {
  const oauth = await emulateGoogleOAuthRoundTrip(page);

  await page.goto("./#/login?returnTo=%2Fsettings");
  const appOrigin = new URL(page.url()).origin;
  await page.getByRole("button", { name: "Google로 계속" }).click();

  await expect(page).toHaveURL(new RegExp(`${E2E_APP_BASE_PATH}#/settings$`));
  expect(oauth.authorizeUrl?.searchParams.get("provider")).toBe("google");
  expect(oauth.authorizeUrl?.searchParams.get("code_challenge")).toBeTruthy();
  expect(oauth.authorizeUrl?.searchParams.get("code_challenge_method")).toBe("s256");
  expect(oauth.redirectTo).toBe(`${appOrigin}${E2E_APP_BASE_PATH}#/auth/callback?returnTo=%2Fsettings`);
  expect(oauth.callbackUrl?.origin).toBe(appOrigin);
  expect(oauth.callbackUrl?.pathname).toBe(E2E_APP_BASE_PATH);
  expect(oauth.callbackUrl?.hash).toBe("#/auth/callback?returnTo=%2Fsettings");
  expect(oauth.tokenBody).toMatchObject({
    auth_code: "e2e-google-code",
    code_verifier: expect.any(String),
  });
  expect(oauth.tokenBody.code_verifier).not.toHaveLength(0);
  await expect(page.getByRole("heading", { name: "SETTINGS" })).toBeVisible();
});
