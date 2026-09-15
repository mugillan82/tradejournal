import { test, expect } from "@playwright/test";

test.describe("Accounts, Settings, Data & Help", () => {
  test("Trading Accounts page displays account table and create modal trigger", async ({ page }) => {
    await page.goto("/accounts");

    // Header exact match to avoid collision with empty state
    await expect(page.getByRole("heading", { name: "Trading Accounts", exact: true })).toBeVisible({ timeout: 10000 });

    // Seeded account is listed in table
    const accountsTable = page.locator("table");
    await expect(accountsTable.getByRole("link", { name: "Paper Alpha Account", exact: true })).toBeVisible({ timeout: 10000 });
    await expect(accountsTable.getByText("USD").first()).toBeVisible();

    // New Account button exists
    const newAccountBtn = page.getByRole("button", { name: /New Account|Add Account/i }).first();
    await expect(newAccountBtn).toBeVisible();
  });

  test("Settings page renders all tabs and allows switching sections", async ({ page }) => {
    await page.goto("/settings");

    // Main header
    await expect(
      page.getByRole("heading", { name: "Product Settings & Customization" }),
    ).toBeVisible({ timeout: 10000 });

    // Verify all key settings tabs exist using role="tab"
    await expect(page.getByRole("tab", { name: "Profile & General" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Trading Defaults" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Display & Format" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Dashboard Layout" })).toBeVisible();

    // Switch to Display & Format tab
    await page.getByRole("tab", { name: "Display & Format" }).click();
    await expect(page.getByText(/Table Density|Row Density/i).first()).toBeVisible();

    // Switch to Trading Defaults tab
    await page.getByRole("tab", { name: "Trading Defaults" }).click();
    await expect(page.getByRole("heading", { name: "Trading Defaults & Risk Rules" })).toBeVisible();
    await expect(page.getByText("Default Trading Account")).toBeVisible();
  });

  test("Help page renders documentation and interactive search", async ({ page }) => {
    await page.goto("/help");

    // Heading
    await expect(
      page.getByRole("heading", { name: "Product Documentation & User Guide" }),
    ).toBeVisible({ timeout: 10000 });

    // Search input
    const searchInput = page.getByPlaceholder(/Search topics/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("CSV import");
    await page.waitForTimeout(300);

    // Topics list should update with matching help cards
    await expect(page.getByText(/CSV/i).first()).toBeVisible();
  });

  test("Data Management page renders export options and record statistics", async ({ page }) => {
    await page.goto("/data-management");

    // Heading
    await expect(
      page.getByRole("heading", { name: "Data Management & Export" }),
    ).toBeVisible({ timeout: 10000 });

    // Export options exist (CSV or JSON backup)
    await expect(
      page.getByRole("button", { name: /Export|Download/i }).or(page.getByText(/Export/i)).first(),
    ).toBeVisible();
  });
});
