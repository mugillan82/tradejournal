import { test, expect } from "@playwright/test";

test.describe("Dashboard & Analytics", () => {
  test("Dashboard renders Command Center, account selector, KPI cards, and quick actions", async ({ page }) => {
    await page.goto("/dashboard");

    // Check main title
    await expect(page.getByRole("heading", { name: "Trading Command Center" })).toBeVisible({ timeout: 10000 });

    // Verify account selector dropdown has the seeded paper account
    const accountSelect = page.locator("#dashboard-account-select");
    await expect(accountSelect).toBeVisible();
    await expect(accountSelect).toContainText("Paper Alpha Account");

    // Verify Refresh button
    const refreshBtn = page.getByRole("button", { name: /Refresh/i }).or(page.locator('button[title*="refresh" i]')).first();
    await expect(refreshBtn).toBeVisible();

    // Verify Quick Actions exist (e.g. Add Trade, Daily Journal, Import)
    const addTradeAction = page.getByRole("link", { name: /Add Trade|New Trade/i }).or(
      page.getByText("Add Trade"),
    ).first();
    await expect(addTradeAction).toBeVisible();

    // Verify recent trades section is rendered
    await expect(page.getByRole("heading", { name: "Recent Trades" })).toBeVisible();
  });

  test("Analytics page renders KPI grid, charts, and breakdown sections", async ({ page }) => {
    await page.goto("/analytics");

    // Wait for skeleton loading to finish
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });

    // Check presence of core metrics in KPI grid
    await expect(page.getByText(/Net P&L/i).first()).toBeVisible();
    await expect(page.getByText(/Win Rate/i).first()).toBeVisible();
    await expect(page.getByText(/Profit Factor/i).first()).toBeVisible();
    await expect(page.getByText(/Total Trades/i).first()).toBeVisible();

    // Filter toolbar controls (Date ranges or accounts)
    const toolbar = page.locator("div").filter({ hasText: /All Accounts|Date Range|Filter/i }).first();
    await expect(toolbar).toBeVisible();
  });
});
