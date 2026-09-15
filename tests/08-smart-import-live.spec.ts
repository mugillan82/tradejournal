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

    // Click "Extract Trades"
    const extractButton = page.getByRole("button", { name: /Extract Trades/i });
    await extractButton.click();

    // Verify it never enters "Extraction Timed Out"
    const timeoutAlert = page.getByText("Extraction Timed Out");
    await expect(timeoutAlert).not.toBeVisible();

    // Wait for Detection Result or Preview Table to appear
    await expect(page.getByText(/Detection Result/i)).toBeVisible({ timeout: 14000 });
    const duration = Date.now() - start;
    console.log(`[Playwright] Smart Import browser extraction completed in ${duration} ms`);

    // Verify platform source
    await expect(page.getByText(/Detected Source: MT5/i)).toBeVisible();

    // Verify preview status badge / table appears
    await expect(page.getByText(/Manual Review Required/i)).toBeVisible();
    await expect(page.getByText(/Ready to Import/i)).toBeVisible();

    // Verify trade rows rendered (e.g. NAS100.X or EURUSD.X)
    await expect(page.getByRole("cell", { name: "NAS100.X" }).first()).toBeVisible();

    // Re-verify no timeout alert exists
    await expect(page.getByText("Extraction Timed Out")).not.toBeVisible();
    await expect(page.getByText("Extraction Failed")).not.toBeVisible();
  });
});
