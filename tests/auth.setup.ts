import { test as setup, expect } from "@playwright/test";
import { seedTestData, TEST_USER_EMAIL, TEST_USER_PASSWORD } from "./helpers/db-seed";
import { STORAGE_STATE } from "../playwright.config";
import fs from "fs";
import path from "path";

setup("authenticate test user and save state", async ({ page }) => {
  // Ensure seed data is ready
  await seedTestData();

  // Ensure output directory exists
  const authDir = path.dirname(STORAGE_STATE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Navigate to sign-in page
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  // Fill in sign-in form using precise input selectors
  await page.locator('input[name="email"]').fill(TEST_USER_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_USER_PASSWORD);

  // Click submit
  await page.getByRole("button", { name: /Sign in/i }).click();

  // Expect redirect to /dashboard
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await expect(page).toHaveURL(/\/dashboard/);

  // Save authenticated state
  await page.context().storageState({ path: STORAGE_STATE });
});
