import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Runtime Errors Verification on /import/smart", () => {
  test("loads /import/smart with zero duplicate-key or hydration warnings, and verifies live functionality", async ({
    page,
  }) => {
    const consoleWarnings: string[] = [];
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      const type = msg.type();
      if (type === "warning") {
        consoleWarnings.push(text);
      } else if (type === "error") {
        consoleErrors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err);
    });

    // 1. Navigate to /import/smart
    await page.goto("/import/smart");
    await page.waitForLoadState("networkidle");

    // 2. Verify sidebar contains /data-management exactly once
    const dataManagementLinks = page.locator('aside a[href="/data-management"]');
    await expect(dataManagementLinks).toHaveCount(1);

    // 3. Verify no duplicate-key warnings
    const duplicateKeyWarnings = consoleWarnings.filter(
      (w) =>
        w.includes("Encountered two children with the same key") ||
        w.includes("/data-management")
    );
    expect(duplicateKeyWarnings).toEqual([]);

    // 4. Verify no hydration mismatch warnings
    const hydrationWarnings = [...consoleWarnings, ...consoleErrors].filter(
      (m) =>
        m.toLowerCase().includes("hydration") ||
        m.toLowerCase().includes("did not match") ||
        m.toLowerCase().includes("server-rendered html")
    );
    expect(hydrationWarnings).toEqual([]);

    // 5. Verify no uncaught page errors
    expect(pageErrors).toEqual([]);

    // 6. Verify Smart Import page structure and file input
    await expect(page.getByRole("heading", { name: /Smart Import/i })).toBeVisible();
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
    const inputId = await fileInput.getAttribute("id");
    expect(inputId).toBeTruthy();

    // 7. Verify Smart Import upload and live extraction flow works
    const fixturePath = path.resolve("src/__tests__/fixtures/real_mt5_history_screenshot.jpg");
    await fileInput.setInputFiles(fixturePath);

    const extractButton = page.getByRole("button", { name: /Extract Trades/i });
    await expect(extractButton).toBeVisible();
    await extractButton.click();

    // Verify it extracts successfully without error/timeout
    await expect(page.getByText(/Detection Result/i)).toBeVisible({ timeout: 14000 });
    await expect(page.getByText(/Detected Source: MT5/i)).toBeVisible();
    await expect(page.getByRole("cell", { name: "NAS100.X" }).first()).toBeVisible();

    // Check again that no duplicate-key or hydration warnings occurred during the interaction
    const laterDuplicateKey = consoleWarnings.filter(
      (w) =>
        w.includes("Encountered two children with the same key") ||
        w.includes("/data-management")
    );
    expect(laterDuplicateKey).toEqual([]);
  });
});
