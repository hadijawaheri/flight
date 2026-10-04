import { defineConfig, devices } from "@playwright/test";

// Expects MongoDB on DATABASE_URL (see apps/api/.env.example). OTP_FIXED_CODE=123456 is test-only.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:7782", locale: "fa-IR", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @flysmart/api start",
      url: "http://localhost:7781/health/live",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "pnpm start",
      url: "http://localhost:7782",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
