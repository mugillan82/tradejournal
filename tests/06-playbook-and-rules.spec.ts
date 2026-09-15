import { test, expect } from "@playwright/test";

test.describe("Playbook, Rules & Tags", () => {
  test("Strategies page renders strategies list and search", async ({ page }) => {
    await page.goto("/strategies");

    // Main heading
    await expect(page.getByRole("heading", { name: "Trading Strategies" })).toBeVisible({ timeout: 10000 });

    // New Strategy CTA button
    const newStrategyBtn = page.getByRole("button", { name: /New Strategy/i });
    await expect(newStrategyBtn).toBeVisible();

    // Seeded strategy card is visible
    await expect(page.getByText("Breakout Trend")).toBeVisible();

    // Search filter input works
    const searchInput = page.getByPlaceholder("Search strategies by name or notes...").or(
      page.locator('input[type="text"]'),
    ).first();
    await searchInput.fill("Breakout");
    await page.waitForTimeout(300);
    await expect(page.getByText("Breakout Trend")).toBeVisible();
  });

  test("Mistakes page renders catalog, allows adding and searching mistakes", async ({ page }) => {
    await page.goto("/mistakes");

    // Heading
    await expect(
      page.getByRole("heading", { name: /Trading Mistakes & Behavioral Rules/i }),
    ).toBeVisible({ timeout: 10000 });

    // Seeded mistake card is visible
    await expect(page.getByText("FOMO Entry")).toBeVisible();

    // New Mistake button
    const newMistakeBtn = page.getByRole("button", { name: "New Mistake" });
    await expect(newMistakeBtn).toBeVisible();
    await newMistakeBtn.click();

    // Modal opens
    await expect(page.getByRole("heading", { name: /Add Behavioral Mistake/i })).toBeVisible();

    // Fill form inside modal
    await page.getByPlaceholder(/e\.g\. FOMO Entry/i).fill("Revenge Trading Test");
    await page.getByPlaceholder(/Explain why this happens/i).fill("Doubled position size immediately after loss");

    // Save mistake
    await page.getByRole("button", { name: "Save Mistake" }).click();

    // Modal closes and newly created mistake appears in list
    await expect(page.getByText("Revenge Trading Test")).toBeVisible({ timeout: 10000 });
  });

  test("Tags page renders tags catalog and allows creating a tag", async ({ page }) => {
    await page.goto("/tags");

    // Heading
    await expect(page.getByRole("heading", { name: /Tags/i })).toBeVisible({ timeout: 10000 });

    // Seeded tag
    await expect(page.getByText("Earnings Play")).toBeVisible();

    // New Tag button
    const newTagBtn = page.getByRole("button", { name: /New Tag/i }).first();
    await expect(newTagBtn).toBeVisible();
  });

  test("Trade Reviews page renders reviews view", async ({ page }) => {
    await page.goto("/reviews");

    // Main reviews heading
    await expect(page.getByRole("heading", { name: /Trade Reviews/i })).toBeVisible({ timeout: 10000 });
  });
});
