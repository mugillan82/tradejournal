import { defineConfig, devices } from "@playwright/test";
import path from "path";

export const STORAGE_STATE = path.join(__dirname, "playwright/.auth/user.json");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*auth\.setup\.ts/,
    },
    {
      name: "chromium-unauth",
      testMatch: /.*01-auth-and-public\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "chromium",
      testIgnore: [/.*auth\.setup\.ts/, /.*01-auth-and-public\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
