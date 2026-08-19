import { expect, test } from "@playwright/test";
import { useAuthenticatedSession } from "./support/supabaseAuth.js";

const THEME_STORAGE_KEY = "momentPlay.theme";
const AVAILABLE_GAME_IDS = [
  "2048",
  "memory",
  "sudoku",
  "omok",
  "flappy",
  "timing-tap",
  "glow-sequence",
  "solitaire",
  "lits",
  "shikaku",
  "minesweeper",
  "set",
  "mosaic",
  "block-blast",
];

async function openTimingTap(page, { fromCatalog = false } = {}) {
  await useAuthenticatedSession(page);
  // A query-string navigation forces a new document even when a previous
  // assertion already changed only the HashRouter fragment in this page.
  await page.goto("./?browser-test=auth#/");
  if (fromCatalog) {
    const primaryNavigation = page.getByRole("navigation", { name: "주요 메뉴" });
    await primaryNavigation.getByRole("link", { name: "게임" }).click();
    await page.locator('[data-game="timing-tap"]').click();
  } else {
    await page.evaluate(() => { window.location.hash = "#/minigames/timing-tap"; });
  }
  const routeStartButton = page.getByRole("button", { name: "게임 시작하기" });
  await expect(routeStartButton).toBeVisible();
  await routeStartButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "목표 구간에 맞춰 탭!" })).toBeVisible();
}

async function openMinesweeper(page) {
  await useAuthenticatedSession(page);
  await page.goto("./?browser-test=minesweeper-touch#/");
  await page.evaluate(() => { window.location.hash = "#/minigames/minesweeper"; });
  await page.getByRole("button", { name: "게임 시작하기" }).click();
  await page.getByRole("dialog", { name: "Minesweeper" })
    .getByRole("button", { name: "게임 시작", exact: true })
    .click();
  await expect(page.getByRole("grid", { name: /지뢰찾기 보드/ })).toBeVisible();
}

async function longPressWithNativeTouch(page, target, durationMs) {
  await target.scrollIntoViewIfNeeded();
  const bounds = await target.boundingBox();
  if (!bounds) throw new Error("Touch target has no visible bounds.");

  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  const touchPoint = {
    force: 1,
    id: 1,
    radiusX: 1,
    radiusY: 1,
    x: Math.floor(bounds.x + bounds.width / 2),
    y: Math.floor(bounds.y + bounds.height / 2),
  };
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touchPoint] });
  await page.waitForTimeout(durationMs);
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach();
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
  await page.goto("./");
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
  await page.goto("./");
  const primaryNavigation = page.getByRole("navigation", { name: "주요 메뉴" });
  const gamesLink = primaryNavigation.getByRole("link", { name: "게임" });
  await gamesLink.focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/#\/minigames$/);
  await expect(page.getByRole("heading", { name: "ALL GAMES" })).toBeVisible();

  await page.goto("./#/does-not-exist");
  await page.getByRole("link", { name: "홈으로 돌아가기" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: "What will you play today?" })).toBeVisible();
});

test("game controls activate from the keyboard and the exit modal pauses play", async ({ page }) => {
  await openTimingTap(page, { fromCatalog: true });
  const gameStartButton = page.getByRole("button", { name: "게임 시작", exact: true });
  await gameStartButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("button", { name: /TAP/ })).toBeVisible();
  const needle = page.locator("[data-timing-needle]");
  await expect.poll(() => needle.getAttribute("style")).not.toContain("left: 0%");

  await page.getByRole("button", { name: "게임 나가기" }).click();
  await expect(page.getByRole("dialog", { name: "타이밍 도전을 나갈까요?" })).toBeVisible();
  const pausedPosition = await needle.getAttribute("style");
  await page.waitForTimeout(350);
  await expect(needle).toHaveAttribute("style", pausedPosition);

  await page.getByRole("button", { name: "계속하기" }).click();
  await expect.poll(() => needle.getAttribute("style")).not.toBe(pausedPosition);

  await page.goBack();
  await expect(page.getByRole("dialog", { name: "타이밍 도전을 나갈까요?" })).toBeVisible();
  await page.getByRole("button", { name: "나가기", exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);

  await page.goBack();
  await expect(page).toHaveURL(/#\/minigames$/);
  await expect(page.getByRole("heading", { name: "ALL GAMES" })).toBeVisible();
  await expect(page.getByRole("button", { name: "게임 시작하기" })).toHaveCount(0);

  await page.goForward();
  await expect(page).toHaveURL(/#\/$/);
  expect(await page.goForward()).toBeNull();
  await expect(page.getByRole("button", { name: "게임 시작하기" })).toHaveCount(0);
});

test.describe("available game routes", () => {
  for (const gameId of AVAILABLE_GAME_IDS) {
    test(`${gameId} loads its playable stage without a runtime failure`, async ({ page }) => {
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await useAuthenticatedSession(page);
      await page.goto(`./?browser-test=game-smoke-${gameId}#/minigames/${gameId}`);
      await page.getByRole("button", { name: "게임 시작하기" }).click();

      await expect(page.locator("section[data-game-stage]")).toBeVisible();
      await expect(page.getByRole("heading", { name: "게임을 계속할 수 없어요." })).toHaveCount(0);
      expect(pageErrors).toEqual([]);
    });
  }
});

test("minesweeper touch gestures cancel pending work across movement, pause, and exit", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await openMinesweeper(page);

  const firstCell = page.locator('[data-index="0"]');
  await longPressWithNativeTouch(page, firstCell, 1_420);
  await expect(firstCell).toHaveAttribute("aria-label", /깃발/);

  const movedCell = page.locator('[data-index="1"]');
  await movedCell.dispatchEvent("pointerdown", {
    clientX: 10,
    clientY: 10,
    isPrimary: true,
    pointerId: 2,
    pointerType: "touch",
  });
  await movedCell.dispatchEvent("pointermove", {
    clientX: 30,
    clientY: 10,
    pointerId: 2,
    pointerType: "touch",
  });
  await page.waitForTimeout(520);
  await expect(movedCell).toHaveAttribute("aria-label", /닫힘/);

  const pausedCell = page.locator('[data-index="2"]');
  await pausedCell.dispatchEvent("pointerdown", {
    clientX: 10,
    clientY: 10,
    isPrimary: true,
    pointerId: 3,
    pointerType: "touch",
  });
  await page.getByRole("button", { name: "게임 일시정지" }).click();
  await page.waitForTimeout(520);
  await expect(pausedCell).toHaveAttribute("aria-label", /닫힘/);
  await page.getByRole("button", { name: "계속하기", exact: true }).click();

  const exitingCell = page.locator('[data-index="3"]');
  await exitingCell.dispatchEvent("pointerdown", {
    clientX: 10,
    clientY: 10,
    isPrimary: true,
    pointerId: 4,
    pointerType: "touch",
  });
  await page.getByRole("button", { name: "게임 나가기" }).click();
  await page.getByRole("dialog", { name: "게임을 나갈까요?" })
    .getByRole("button", { name: "나가기", exact: true })
    .click();
  await page.waitForTimeout(520);
  await expect(page).toHaveURL(/#\/$/);
  expect(pageErrors).toEqual([]);
});

test("core screens do not create horizontal overflow on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  for (const route of ["/", "/#/minigames", "/#/does-not-exist"]) {
    await page.goto(`.${route}`);
    await expectNoHorizontalOverflow(page);
  }

  await openTimingTap(page);
  await expectNoHorizontalOverflow(page);
});
