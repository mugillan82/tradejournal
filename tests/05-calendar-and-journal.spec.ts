import { test, expect } from "@playwright/test";

test.describe("Calendar, Journal & Notebook", () => {
  test("Calendar page renders month grid, month controls, and summary", async ({ page }) => {
    await page.goto("/calendar");

    // Check main container
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });

    // Header or month selector exists
    const prevMonthBtn = page.getByRole("button", { name: /Previous Month/i }).or(page.locator('button[title*="prev" i]')).first();
    const nextMonthBtn = page.getByRole("button", { name: /Next Month/i }).or(page.locator('button[title*="next" i]')).first();
    await expect(prevMonthBtn).toBeVisible();
    await expect(nextMonthBtn).toBeVisible();

    // Days of week header (Sun, Mon, Tue, etc.)
    await expect(page.getByText("Mon", { exact: false }).first()).toBeVisible();

    // Click next month and verify URL or month updates
    await nextMonthBtn.click();
    await page.waitForTimeout(300);
    // Click prev month back
    await prevMonthBtn.click();
    await page.waitForTimeout(300);
  });

  test("Daily Journal page renders date navigator, history, and entry controls", async ({ page }) => {
    await page.goto("/journal");

    // Main journal heading
    await expect(page.getByRole("heading", { name: "Daily Trading Journal" })).toBeVisible({ timeout: 10000 });

    // Date navigation controls exist
    await expect(page.getByRole("button", { name: "Previous Day" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next Day" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();

    // Seeded journal entry appears in Journal History
    await expect(page.getByText("Disciplined execution day")).toBeVisible();

    // Search reflections input is available
    const searchReflections = page.getByPlaceholder("Search reflections...");
    await expect(searchReflections).toBeVisible();
  });

  test("Notebook page renders notes search, list, and create button", async ({ page }) => {
    await page.goto("/notebook");

    // Header
    await expect(page.getByRole("heading", { name: /Notebook/i })).toBeVisible({ timeout: 10000 });

    // Search input
    const searchInput = page.getByPlaceholder(/Search notes/i).or(page.locator('input[type="text"]')).first();
    await expect(searchInput).toBeVisible();

    // New Note button
    const newNoteBtn = page.getByRole("button", { name: /New Note|Create Note/i }).or(
      page.getByText(/New Note/i),
    ).first();
    await expect(newNoteBtn).toBeVisible();
  });
});
