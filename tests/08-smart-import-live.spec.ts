import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Smart Import Live Upload Flow", () => {
  test("uploads real MT5 mobile screenshot and completes extraction without timeout", async ({ page }) => {
    // Navigate to Smart Import page
    await page.goto("/import/smart");
    await page.waitForLoadState("networkidle");

    // Verify initial state
    await expect(page.getByRole("heading", { name: /Smart Import/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Extract Trades/i })).toBeVisible();

    // Select the real MT5 screenshot fixture
    const fixturePath = path.resolve("src/__tests__/fixtures/real_mt5_history_screenshot.jpg");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(fixturePath);

    const start = Date.now();

    const responsePromise = page.waitForResponse((r) =>
      r.url().includes("/api/imports/smart/preview")
    );

    // Click "Extract Trades"
    const extractButton = page.getByRole("button", { name: /Extract Trades/i });
    await extractButton.click();

    const response = await responsePromise;
    const json = await response.json();

    // 1. Verify API response candidate count
    expect(response.status()).toBe(200);
    expect(json.success).toBe(true);
    expect(json.preview?.candidates).toHaveLength(30);
    expect(json.preview?.nonTradeCount).toBeGreaterThanOrEqual(5);

    // 2. Wait for Detection Result and Preview Table to appear
    await expect(page.getByText(/Detection Result/i)).toBeVisible({ timeout: 14000 });
    const duration = Date.now() - start;
    console.log(`[Playwright] Smart Import 30-trade browser extraction completed in ${duration} ms`);

    // 3. Verify platform source
    await expect(page.getByText(/Detected Source: MT5/i)).toBeVisible();

    // 4. Verify preview summary counters and badges
    await expect(page.getByText(/Manual Review Required/i)).toBeVisible();
    await expect(page.getByText(/Ready to Import/i)).toBeVisible();

    // 5. Critical assertion: verify all 30 candidates are rendered in the review table (no truncation to 1)
    const tableRows = page.locator("tbody tr");
    await expect(tableRows).toHaveCount(30);

    // 6. Verify trade rows rendered without non-trade cashflow rows leaking into candidate list
    await expect(page.getByRole("cell", { name: "NAS100.X" }).first()).toBeVisible();
    for (let i = 0; i < 30; i++) {
      const cellText = await tableRows.nth(i).locator("td").first().innerText();
      expect(/balance|deposit|withdrawal|swap|commission/i.test(cellText)).toBe(false);
    }

    // 7. Verify all candidates (Ready + Needs Review / Invalid) remain visible for user review
    const readyBadges = page.locator("tbody span:has-text('Ready')");
    const invalidBadges = page.locator("tbody span:has-text('Invalid')");
    const duplicateBadges = page.locator("tbody span:has-text('Duplicate')");
    const totalBadges =
      (await readyBadges.count()) +
      (await invalidBadges.count()) +
      (await duplicateBadges.count());
    expect(totalBadges).toBe(30);

    // 8. Re-verify no error or timeout alert exists
    await expect(page.getByText("Extraction Timed Out")).not.toBeVisible();
    await expect(page.getByText("Extraction Failed")).not.toBeVisible();
  });

  test("uploads single-trade MT5 screenshot and verifies UI displays exact 1 trade row with 5 excluded non-trades", async ({
    page,
  }) => {
    // Navigate to Smart Import page
    await page.goto("/import/smart");
    await page.waitForLoadState("networkidle");

    // Select the single-trade MT5 screenshot fixture
    const fixturePath = path.resolve("src/__tests__/fixtures/single_trade_mt5_screenshot.jpg");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(fixturePath);

    const responsePromise = page.waitForResponse((r) =>
      r.url().includes("/api/imports/smart/preview")
    );

    // Click "Extract Trades"
    const extractButton = page.getByRole("button", { name: /Extract Trades/i });
    await extractButton.click();

    const response = await responsePromise;
    const json = await response.json();

    // Verify API response
    expect(response.status()).toBe(200);
    expect(json.preview?.candidates).toHaveLength(1);
    expect(json.preview?.readyCount).toBe(1);
    expect(json.preview?.duplicateCount).toBe(0);
    expect(json.preview?.errorCount).toBe(0);
    expect(json.preview?.nonTradeCount).toBe(5);

    // Wait for Detection Result
    await expect(page.getByText(/Detection Result/i)).toBeVisible({ timeout: 14000 });
    await expect(page.getByText(/Detected Source: MT5/i)).toBeVisible();

    // Verify UI summary counters
    await expect(page.getByText("Ready to Import")).toBeVisible();
    await expect(page.getByText("Non-Trades Excluded")).toBeVisible();

    // Verify exactly 1 trade row is displayed in the table
    const tableRows = page.locator("tbody tr");
    await expect(tableRows).toHaveCount(1);

    // Verify row details match the screenshot exactly
    const row = tableRows.first();
    await expect(row.getByRole("cell", { name: "NAS100" })).toBeVisible();
    await expect(row.getByRole("cell", { name: "SHORT" })).toBeVisible();
    await expect(row.getByRole("cell", { name: "29029.97" })).toBeVisible();
    await expect(row.getByRole("cell", { name: "-268.55" })).toBeVisible();
    await expect(row.getByText("Ready")).toBeVisible();
  });
});
