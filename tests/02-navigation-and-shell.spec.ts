import { test, expect } from "@playwright/test";

test.describe("App Shell & Navigation", () => {
  test("Desktop sidebar displays all sections and highlights active route", async ({ page }) => {
    await page.goto("/dashboard");

    // Sidebar should be visible on desktop viewport
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    // Check brand mark in sidebar
    await expect(sidebar.getByText("TradeJournal")).toBeVisible();

    // Check key navigation section labels (rendered as uppercase paragraphs)
    const nav = sidebar.locator("nav");
    await expect(nav.locator("p").filter({ hasText: /^Overview$/i })).toBeVisible();
    await expect(nav.locator("p").filter({ hasText: /^Trading$/i })).toBeVisible();
    await expect(nav.locator("p").filter({ hasText: /^Analytics$/i })).toBeVisible();
    await expect(nav.locator("p").filter({ hasText: /^Journal$/i })).toBeVisible();
    await expect(nav.locator("p").filter({ hasText: /^Data$/i })).toBeVisible();
    await expect(nav.locator("p").filter({ hasText: /^Settings$/i })).toBeVisible();

    // Test navigating to Trades via sidebar
    const tradesLink = sidebar.getByRole("link", { name: "Trades", exact: true });
    await expect(tradesLink).toBeVisible();
    await tradesLink.click();
    await expect(page).toHaveURL(/\/trades/);

    // Test navigating to Calendar via sidebar
    const calendarLink = sidebar.getByRole("link", { name: "Calendar", exact: true });
    await calendarLink.click();
    await expect(page).toHaveURL(/\/calendar/);

    // Test navigating to Settings via sidebar
    const settingsLink = sidebar.getByRole("link", { name: "Settings", exact: true });
    await settingsLink.click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test("Topbar renders user menu with profile details and sign-out", async ({ page }) => {
    await page.goto("/dashboard");

    // Topbar header should be visible
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Click User menu button
    const userMenuButton = header.getByRole("button", { name: /Playwright Tester/i });
    await expect(userMenuButton).toBeVisible();
    await userMenuButton.click();

    // Menu dropdown opens
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible();
    await expect(menu.getByText("playwright_test@example.com")).toBeVisible();

    // Sign out button exists
    const signOutBtn = menu.getByRole("button", { name: /Sign out/i });
    await expect(signOutBtn).toBeVisible();
  });

  test("Mobile responsive drawer navigation functions on small viewports", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Desktop sidebar should be hidden
    const desktopSidebar = page.locator("div.hidden.lg\\:flex");
    await expect(desktopSidebar).toBeHidden();

    // Open navigation button should be visible in header
    const hamburgerBtn = page.getByRole("button", { name: "Open navigation" });
    await expect(hamburgerBtn).toBeVisible();
    await hamburgerBtn.click();

    // Mobile drawer should open and reveal navigation items
    const mobileDrawer = page.getByRole("dialog", { name: "Main navigation" });
    await expect(mobileDrawer).toBeVisible();

    // Click Analytics link inside the drawer
    const analyticsLink = mobileDrawer.getByRole("link", { name: "Analytics" });
    await expect(analyticsLink).toBeVisible();
    await analyticsLink.click();

    // Navigates to /analytics
    await expect(page).toHaveURL(/\/analytics/);
  });
});
