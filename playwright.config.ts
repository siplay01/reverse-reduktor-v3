import { defineConfig, devices } from "@playwright/test";
// PW_URL=https://.../ runs the suite against a deployed site instead of the local preview.
const root = process.env.PW_URL || `http://localhost:4321${process.env.PW_BASE || process.env.BASE_PATH || "/reverse-reduktor-v3/"}`;
export default defineConfig({
  testDir: "qa/tests",
  outputDir: "qa/test-results",
  reporter: [["list"], ["json", { outputFile: "qa/test-results.json" }]],
  fullyParallel: true,
  retries: 0,
  use: { baseURL: root, trace: "off" },
  webServer: process.env.PW_URL ? undefined : { command: "npx astro preview --port 4321", url: root, reuseExistingServer: !process.env.CI },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "iphone-webkit", use: { ...devices["iPhone 13"] } },
    { name: "edge-like-chromium", use: { ...devices["Desktop Edge"] } },
  ],
});
