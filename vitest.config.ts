import { defineConfig } from "vitest/config";

// Keep vitest scoped to unit tests under src/, so it never tries to run the
// Playwright specs in e2e/ (which use @playwright/test's own runner).
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
