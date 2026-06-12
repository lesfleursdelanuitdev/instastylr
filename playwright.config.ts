import { defineConfig, devices } from "@playwright/test";

// E2E lives in ./e2e and is excluded from vitest (see vitest.config.ts) so the
// two runners never pick up each other's files. The dev server is started for us.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    launchOptions: { args: ["--no-sandbox"] }, // headless server environment
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
