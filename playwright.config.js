import { defineConfig, devices } from "@playwright/test";
import {
  E2E_APP_BASE_PATH,
  E2E_HTML_REPORT_DIR,
  E2E_OUTPUT_DIR,
  E2E_PORT,
} from "./tests/e2e/support/environment.js";

const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}${E2E_APP_BASE_PATH}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: E2E_OUTPUT_DIR,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: E2E_HTML_REPORT_DIR }]]
    : "list",
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
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${E2E_PORT} --strictPort`,
    env: {
      ...process.env,
      GITHUB_PAGES: "true",
      VITE_AUTH_GOOGLE_ENABLED: "true",
      VITE_SUPABASE_PUBLISHABLE_KEY: "e2e-publishable-key",
      VITE_SUPABASE_URL: "https://e2e.supabase.co",
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: E2E_BASE_URL,
  },
});
