import { defineConfig, devices } from "@playwright/test";

const PRODUCTION = 3100;
const DEVELOPMENT = 3220;
/** The stand-in for the Messages API that Ask asks in these tests (tests/support/anthropic-mock.ts). */
const ANTHROPIC_MOCK = 3199;
const production = `http://localhost:${PRODUCTION}`;
const development = `http://localhost:${DEVELOPMENT}`;

/** Specs that need dev-only routes: the kitchen, the cursor's playground, the portrait hero. */
const DEV_ONLY = /(kitchen|cursor|portrait)\.spec/;

/**
 * End-to-end tests, Safari first (DESIGN.md §2 rule 8). Site tests run against a
 * production build. The kitchen and /dev/hero exist only under `next dev`, so their tests,
 * and the cursor's (which use the kitchen's playground), get a dev server of their own.
 * Servers are never reused, so a test can't hit some other app on the same port.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  // A stuck action fails with its own name rather than running out the test's clock.
  use: { trace: "on-first-retry", actionTimeout: 10_000 },
  projects: [
    { name: "webkit", testIgnore: DEV_ONLY, use: { ...devices["Desktop Safari"], baseURL: production } },
    { name: "mobile-safari", testIgnore: DEV_ONLY, use: { ...devices["iPhone 15"], baseURL: production } },
    { name: "chromium", testIgnore: DEV_ONLY, use: { ...devices["Desktop Chrome"], baseURL: production } },
    { name: "kitchen-webkit", testMatch: DEV_ONLY, use: { ...devices["Desktop Safari"], baseURL: development } },
    { name: "kitchen-chromium", testMatch: DEV_ONLY, use: { ...devices["Desktop Chrome"], baseURL: development } },
  ],
  webServer: [
    {
      // Words a little apart, so an answer streams for long enough to watch.
      command: `ANTHROPIC_MOCK_PORT=${ANTHROPIC_MOCK} ANTHROPIC_MOCK_DELAY=30 node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/support/anthropic-mock.ts`,
      url: `http://127.0.0.1:${ANTHROPIC_MOCK}/`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      // The composer's console transport and in-memory limit, on purpose: a real build with
      // no keys answers 503 (tested in the unit tests), and this one delivers end to end.
      // Ask, likewise, asks the stand-in with a stand-in key and its limits in memory; a
      // build with no key answers 503 (the unit tests), which the page meets with its own text.
      command: [
        "npm run build &&",
        "CONTACT_TRANSPORT=console",
        `ASK_ENABLED=true ANTHROPIC_API_KEY=sk-mock ANTHROPIC_BASE_URL=http://127.0.0.1:${ANTHROPIC_MOCK} ASK_LIMIT=memory`,
        `npm run start -- --port ${PRODUCTION}`,
      ].join(" "),
      url: production,
      reuseExistingServer: false,
      timeout: 240_000,
    },
    {
      command: `node scripts/portrait-fixture.mjs && npx next dev --port ${DEVELOPMENT}`,
      url: `${development}/dev/kitchen`,
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});
