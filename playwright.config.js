import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = 4173;
const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: E2E_BASE_URL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${E2E_PORT}`,
    env: {
      ...process.env,
      VITE_SUPABASE_PUBLISHABLE_KEY: "e2e-publishable-key",
      VITE_SUPABASE_URL: "https://e2e.supabase.co",
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: E2E_BASE_URL,
  },
});
