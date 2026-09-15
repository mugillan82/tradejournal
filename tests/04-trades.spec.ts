import { test, expect } from "@playwright/test";

test.describe("Trades & Logging", () => {
  test("Trades list page displays table, seeded trades, and filter controls", async ({ page }) => {
    await page.goto("/trades");

    // Header title and Add Trade link
    await expect(page.getByRole("heading", { name: "Trade Log" })).toBeVisible({ timeout: 10000 });
    const addTradeBtn = page.getByRole("link", { name: /Add Trade/i }).first();
    await expect(addTradeBtn).toBeVisible();

    // Verify search input is present
    const searchInput = page.getByPlaceholder("Search trades by title or notes...");
    await expect(searchInput).toBeVisible();

    // Verify seeded trades appear in the table
    const table = page.locator("table");
    await expect(table.getByText("AAPL Breakout Long")).toBeVisible();
    await expect(table.getByText("TSLA Short Pullback")).toBeVisible();

    // Test search filtering: searching for "AAPL" keeps AAPL and hides TSLA
    await searchInput.fill("AAPL");
    await page.waitForTimeout(400); // Allow debounce
    await expect(table.getByText("AAPL Breakout Long")).toBeVisible();
    await expect(table.getByText("TSLA Short Pullback")).toBeHidden();

    // Clear search filter
    await searchInput.clear();
    await page.waitForTimeout(400);
    await expect(table.getByText("TSLA Short Pullback")).toBeVisible();
  });

  test("Add Trade form validates fields and creates a new trade", async ({ page }) => {
    await page.goto("/trades/new");

    // Page header
    await expect(page.getByRole("heading", { name: "Add New Trade" })).toBeVisible({ timeout: 10000 });

    // Verify Account select is pre-populated
    const accountSelect = page.getByRole("combobox", { name: /Trading Account/i });
    await expect(accountSelect).toBeVisible();
    await expect(accountSelect).toContainText("Paper Alpha Account");

    // Fill in new trade details with a unique timestamp title
    const uniqueTradeTitle = `MSFT Long ${Date.now()}`;
    const titleInput = page.getByPlaceholder(/e\.g\. AAPL breakout/i);
    await titleInput.fill(uniqueTradeTitle);

    // Fill price & quantity
    const entryPriceInput = page.getByRole("textbox", { name: /Entry Price/i });
    await entryPriceInput.fill("400.00");

    const quantityInput = page.getByRole("textbox", { name: /Quantity \/ Size/i });
    await quantityInput.fill("25");

    // Fill Stop loss & Take profit
    const stopLossInput = page.getByRole("textbox", { name: /Stop Loss/i });
    if (await stopLossInput.isVisible()) {
      await stopLossInput.fill("390.00");
    }

    const takeProfitInput = page.getByRole("textbox", { name: /Take Profit/i });
    if (await takeProfitInput.isVisible()) {
      await takeProfitInput.fill("430.00");
    }

    // Submit form and wait for the API response
    const saveBtn = page.getByRole("button", { name: /Save Trade/i });
    const [createResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/trades") && r.request().method() === "POST"),
      saveBtn.click(),
    ]);

    expect(createResponse.status()).toBe(201);

    // Wait for redirect to trade detail page
    await page.waitForURL(/\/trades\/[a-zA-Z0-9-]+$/, { timeout: 15000 });

    // Navigate back to /trades and verify newly created trade is listed in table
    await page.goto("/trades");
    await expect(page.locator("table").getByText(uniqueTradeTitle)).toBeVisible({ timeout: 10000 });
  });
});
