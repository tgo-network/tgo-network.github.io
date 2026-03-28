import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

const siteUrl = process.env.E2E_SITE_URL ?? "http://localhost:4321";
const adminUrl = process.env.E2E_ADMIN_URL ?? "http://localhost:5173";
const apiUrl = process.env.E2E_API_URL ?? "http://localhost:8787";
const useSystemChrome = process.platform === "darwin" && existsSync("/Applications/Google Chrome.app");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI || !useSystemChrome ? {} : { channel: "chrome" })
      }
    }
  ],
  webServer: [
    {
      command: "npm run dev:api",
      url: `${apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: "npm run dev:site",
      url: siteUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: "npm run dev:admin",
      url: `${adminUrl}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
