import { defineConfig, devices } from "@playwright/test";

const PRODUCTION = 3100;
const DEVELOPMENT = 3220;
const production = `http://localhost:${PRODUCTION}`;
const development = `http://localhost:${DEVELOPMENT}`;

/**
 * End-to-end tests, Safari first (DESIGN.md §2 rule 8). Site tests run against a
 * production build. The kitchen exists only under `next dev`, so its tests, and the
 * cursor's (which use its playground), get a dev server of their own. Servers are never
 * reused, so a test can't hit some other app on the same port.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { trace: "on-first-retry" },
  projects: [
    { name: "webkit", testIgnore: /(kitchen|cursor)\.spec/, use: { ...devices["Desktop Safari"], baseURL: production } },
    { name: "mobile-safari", testIgnore: /(kitchen|cursor)\.spec/, use: { ...devices["iPhone 15"], baseURL: production } },
    { name: "chromium", testIgnore: /(kitchen|cursor)\.spec/, use: { ...devices["Desktop Chrome"], baseURL: production } },
    { name: "kitchen-webkit", testMatch: /(kitchen|cursor)\.spec/, use: { ...devices["Desktop Safari"], baseURL: development } },
    { name: "kitchen-chromium", testMatch: /(kitchen|cursor)\.spec/, use: { ...devices["Desktop Chrome"], baseURL: development } },
  ],
  webServer: [
    {
      command: `npm run build && npm run start -- --port ${PRODUCTION}`,
      url: production,
      reuseExistingServer: false,
      timeout: 240_000,
    },
    {
      command: `npx next dev --port ${DEVELOPMENT}`,
      url: `${development}/dev/kitchen`,
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});
