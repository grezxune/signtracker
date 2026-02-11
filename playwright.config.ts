import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:4010";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "bun run dev -- --port 4010",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          E2E_TEST_MODE: "true",
          NEXT_PUBLIC_E2E_TEST_MODE: "true",
          E2E_TEST_EMAIL: process.env.E2E_TEST_EMAIL || "e2e@example.com",
          E2E_TEST_PASSWORD: process.env.E2E_TEST_PASSWORD || "e2e-password",
          NEXT_PUBLIC_E2E_TEST_EMAIL: process.env.E2E_TEST_EMAIL || "e2e@example.com",
          NEXT_PUBLIC_E2E_TEST_PASSWORD: process.env.E2E_TEST_PASSWORD || "e2e-password",
          AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID || "e2e-google-id",
          AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET || "e2e-google-secret",
          AUTH_SECRET:
            process.env.AUTH_SECRET || "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
          NEXTAUTH_URL: baseURL,
        },
      },
});
