import { defineConfig, devices } from "@playwright/test";

const MOCK_PORT = 4010;
const APP_PORT = 3100;
const MOCK_ORIGIN = `http://localhost:${MOCK_PORT}`;

/** The app is built and started against the local mock APIs: e2e tests never hit real services. */
const appEnv = {
  NEXT_DIST_DIR: ".next-e2e",
  NEXT_PUBLIC_APP_URL: `http://localhost:${APP_PORT}`,
  AIC_API_URL: `${MOCK_ORIGIN}/aic/api/v1`,
  AIC_IIIF_URL: `${MOCK_ORIGIN}/iiif/2`,
  CMA_API_URL: `${MOCK_ORIGIN}/cma/api`,
  WIKIPEDIA_URL_TEMPLATE: `${MOCK_ORIGIN}/wiki/{lang}`,
  WIKIPEDIA_USER_AGENT: "ArtExplorer/1.0 (e2e tests)",
  E2E_MOCK_ORIGIN: MOCK_ORIGIN,
  IMAGE_UNOPTIMIZED: "true",
  EXTERNAL_API_TIMEOUT_MS: "3000",
  NEXT_TELEMETRY_DISABLED: "1",
  TRANSLATION_ENABLED: "false",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 45_000,
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    locale: "ru-RU",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: "node --experimental-strip-types --no-warnings tests/e2e/mock-server.mts",
      url: `${MOCK_ORIGIN}/health`,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_PORT: String(MOCK_PORT) },
    },
    {
      command: `npx next build && npx next start -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: appEnv,
    },
  ],
});
