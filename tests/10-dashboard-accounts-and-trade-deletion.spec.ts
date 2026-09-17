import { test, expect } from "@playwright/test";

test.describe("Dashboard Account Controls & Trade Selection Deletion", () => {
  test("Dashboard + and - buttons allow adding a new account, pre-selecting for trade entry, and removing it", async ({
    page,
  }) => {
    // 1. Visit dashboard
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Trading Command Center" })).toBeVisible({
      timeout: 10000,
    });

    // 2. Click + button in dashboard header
    const addAccountBtn = page.getByTestId("dashboard-add-account-btn");
    await expect(addAccountBtn).toBeVisible();
    await addAccountBtn.click();

    // 3. Verify AccountCreateModal opens
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /add trading account/i })).toBeVisible();

    // 4. Fill form and submit
    const accountName = `Live Scalp Fund ${Date.now()}`;
    await page.getByLabel(/account name/i).fill(accountName);
    await page.getByLabel(/initial balance/i).fill("50000");

    await page.getByRole("button", { name: /create account/i }).click();

    // 5. Modal closes and new account is automatically selected in the dashboard dropdown
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10000 });
    const accountSelect = page.getByLabel(/filter by trading account/i);
    await expect(accountSelect).toBeVisible();

    // Verify option exists and is selected
    await expect(accountSelect).toHaveValue(/.+/);
    const selectedOptionText = await accountSelect.locator("option:checked").textContent();
    expect(selectedOptionText).toContain(accountName);

    // 6. Verify minus (-) button is now visible because an account is selected
    const deleteAccountBtn = page.getByTestId("dashboard-delete-account-btn");
    await expect(deleteAccountBtn).toBeVisible();

    // 7. Click Add New Trade from Quick Actions to verify pre-selection in trade form
    const logTradeLink = page.getByRole("link", { name: /log trade/i }).first();
    await expect(logTradeLink).toBeVisible();
    await logTradeLink.click();

    await page.waitForURL(/\/trades\/new/);
    await expect(page.getByRole("heading", { name: "Add New Trade" })).toBeVisible({ timeout: 10000 });

    const tradeAccountSelect = page.getByRole("combobox", { name: /trading account/i });
    await expect(tradeAccountSelect).toBeVisible();
    const tradeSelectedText = await tradeAccountSelect.locator("option:checked").textContent();
    expect(tradeSelectedText).toContain(accountName);

    // 8. Return to dashboard and delete the temporary account with (-) button
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Trading Command Center" })).toBeVisible({
      timeout: 10000,
    });

    // Re-select if not already
    const dashboardSelect = page.getByLabel(/filter by trading account/i);
    const option = dashboardSelect.locator(`option:has-text("${accountName}")`);
    const optionVal = await option.getAttribute("value");
    if (optionVal) {
      await dashboardSelect.selectOption(optionVal);
    }

    const deleteBtn = page.getByTestId("dashboard-delete-account-btn");
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // 9. Confirm deletion in AccountDeleteModal
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /delete trading account/i })).toBeVisible();
    await page.getByRole("button", { name: /delete account/i }).click();

    // 10. Verify modal closes and account is no longer in selector
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10000 });
    await expect(page.getByLabel(/filter by trading account/i)).not.toContainText(accountName);
  });

  test("Trades page supports selecting trades and deleting them individually or in batch", async ({
    page,
  }) => {
    // 1. Create a trade to test deletion
    await page.goto("/trades/new");
    await expect(page.getByRole("heading", { name: "Add New Trade" })).toBeVisible({ timeout: 10000 });

    const tradeTitle1 = `Delete Test Single ${Date.now()}`;
    await page.getByPlaceholder(/e\.g\. AAPL breakout/i).fill(tradeTitle1);
    await page.getByRole("textbox", { name: /Entry Price/i }).fill("150.00");
    await page.getByRole("textbox", { name: /Quantity \/ Size/i }).fill("10");
    await page.getByRole("button", { name: /save trade/i }).click();

    // Wait for redirect to trade detail
    await page.waitForURL(/\/trades\/.+/);

    // 2. Go to /trades list page
    await page.goto("/trades");
    await expect(page.getByRole("heading", { name: "Trade Log" })).toBeVisible({ timeout: 10000 });

    const table = page.locator("table");
    await expect(table.getByText(tradeTitle1)).toBeVisible({ timeout: 10000 });

    // 3. Locate the row and verify selection checkbox
    const row = table.locator("tr", { hasText: tradeTitle1 });
    const rowCheckbox = row.locator('input[type="checkbox"]');
    await expect(rowCheckbox).toBeVisible();

    // Click checkbox to select trade
    await rowCheckbox.click();
    await expect(rowCheckbox).toBeChecked();

    // 4. Batch selection bar appears
    await expect(page.getByText(/1 trade selected/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /delete selected \(1\)/i })).toBeVisible();

    // Clear selection
    await page.getByRole("button", { name: /clear/i }).click();
    await expect(rowCheckbox).not.toBeChecked();
    await expect(page.getByText(/1 trade selected/i)).toBeHidden();

    // 5. Test Single Trade Deletion via row trash icon button
    const rowDeleteBtn = row.getByRole("button", { name: /delete trade/i });
    await expect(rowDeleteBtn).toBeVisible();
    await rowDeleteBtn.click();

    // Alert dialog opens
    const singleDeleteDialog = page.getByRole("alertdialog");
    await expect(singleDeleteDialog).toBeVisible();
    await expect(singleDeleteDialog.getByText(/delete trade record/i)).toBeVisible();

    // Confirm deletion
    await singleDeleteDialog.getByRole("button", { name: /delete trade/i }).click();

    // Verify dialog closes and trade is gone from table
    await expect(singleDeleteDialog).toBeHidden({ timeout: 10000 });
    await expect(table.getByText(tradeTitle1)).toBeHidden();
  });
});
