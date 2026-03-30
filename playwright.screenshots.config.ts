import { defineConfig } from "@playwright/test";

import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  testDir: "./e2e",
  testMatch: "**/*.shots.ts",
  testIgnore: ["**/*.spec.ts", "**/*.test.ts"],
  reporter: [["list"]],
  use: {
    ...baseConfig.use,
    trace: "off",
    screenshot: "off",
    video: "off"
  }
});
