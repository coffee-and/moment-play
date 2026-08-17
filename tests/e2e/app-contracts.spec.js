import { expect, test } from "@playwright/test";

const AUTH_STORAGE_KEY = "sb-e2e-auth-token";
const THEME_STORAGE_KEY = "momentPlay.theme";

function createTestSession() {
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
      app_metadata: { provider: "email", providers: ["email"] },
      aud: "authenticated",
      created_at: new Date(0).toISOString(),
      email: "browser-test@example.com",
      id: "00000000-0000-4000-8000-000000000001",
      role: "authenticated",
      user_metadata: {},
    },
  };
}

async function useAuthenticatedSession(page) {
  await page.route("https://e2e.supabase.co/**", (route) => route.fulfill({
    body: "[]",
    contentType: "application/json",
    status: 200,
  }));
  await page.addInitScript(({ storageKey, session }) => {
    window.localStorage.setItem(storageKey, JSON.stringify(session));
  }, { storageKey: AUTH_STORAGE_KEY, session: createTestSession() });
}

async function openTimingTap(page) {
  await useAuthenticatedSession(page);
  // A query-string navigation forces a new document even when a previous
  // assertion already changed only the HashRouter fragment in this page.
  await page.goto("/?browser-test=auth#/minigames/timing-tap");
  const routeStartButton = page.getByRole("button", { name: "게임 시작하기" });
  await expect(routeStartButton).toBeVisible();
  await routeStartButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "목표 구간에 맞춰 탭!" })).toBeVisible();
}

async function expectNoHorizontalOverflow(page) {
  const widths = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(Math.max(widths.body, widths.root)).toBeLessThanOrEqual(widths.viewport + 1);
}

test("theme selection persists across a reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "다크 테마로 전환" }).click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), THEME_STORAGE_KEY))
    .toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "라이트 테마로 전환" })).toBeVisible();
});

test("primary navigation and unknown-route recovery preserve hash routing", async ({ page }) => {
  await page.goto("/");
  const primaryNavigation = page.getByRole("navigation", { name: "주요 메뉴" });
  const gamesLink = primaryNavigation.getByRole("link", { name: "게임" });
  await gamesLink.focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/#\/minigames$/);
  await expect(page.getByRole("heading", { name: "ALL GAMES" })).toBeVisible();

  await page.goto("/#/does-not-exist");
  await page.getByRole("link", { name: "홈으로 돌아가기" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: "What will you play today?" })).toBeVisible();
});

test("game controls activate from the keyboard and the exit modal pauses play", async ({ page }) => {
  await openTimingTap(page);
  const gameStartButton = page.getByRole("button", { name: "게임 시작", exact: true });
  await gameStartButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("button", { name: /TAP/ })).toBeVisible();
  const needle = page.locator(".timing-tap__needle");
  await expect.poll(() => needle.getAttribute("style")).not.toContain("left: 0%");

  await page.getByRole("button", { name: "게임 나가기" }).click();
  await expect(page.getByRole("dialog", { name: "타이밍 도전을 나갈까요?" })).toBeVisible();
  const pausedPosition = await needle.getAttribute("style");
  await page.waitForTimeout(350);
  await expect(needle).toHaveAttribute("style", pausedPosition);

  await page.getByRole("button", { name: "계속하기" }).click();
  await expect.poll(() => needle.getAttribute("style")).not.toBe(pausedPosition);
});

test("core screens do not create horizontal overflow on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  for (const route of ["/", "/#/minigames", "/#/does-not-exist"]) {
    await page.goto(route);
    await expectNoHorizontalOverflow(page);
  }

  await openTimingTap(page);
  await expectNoHorizontalOverflow(page);
});
