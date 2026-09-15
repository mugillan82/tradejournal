import { test, expect } from "@playwright/test";

test.describe("Public & Authentication Flows", () => {
  test("Landing page renders branding, copy, and navigation links", async ({ page }) => {
    await page.goto("/");

    // Verify main brand heading and copy
    await expect(page.getByRole("heading", { name: "TradeJournal" })).toBeVisible();
    await expect(
      page.getByText("A modern trading log and analytics platform", { exact: false }),
    ).toBeVisible();

    // Verify CTAs
    const signInLink = page.getByRole("link", { name: "Sign in" });
    const createAccountLink = page.getByRole("link", { name: "Create account" });

    await expect(signInLink).toBeVisible();
    await expect(createAccountLink).toBeVisible();

    // Verify navigation to /sign-in
    await signInLink.click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("Protected routes redirect unauthenticated users to /sign-in", async ({ page }) => {
    // Attempt accessing /dashboard directly
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fdashboard/);

    // Attempt accessing /trades directly
    await page.goto("/trades");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Ftrades/);

    // Attempt accessing /settings directly
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fsettings/);
  });

  test("Sign-in page validates required fields and invalid credentials", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByText("Sign in to your TradeJournal account.")).toBeVisible();

    // Password visibility toggle test
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute("type", "password");

    const togglePasswordBtn = page.getByRole("button", { name: /Show password/i });
    await togglePasswordBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: /Hide password/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Attempt invalid credentials
    await page.locator('input[name="email"]').fill("nonexistent_trader@example.com");
    await passwordInput.fill("WrongPassword123!");
    await page.getByRole("button", { name: /Sign in/i }).click();

    // Error alert is displayed
    const errorAlert = page.getByText(/Invalid email or password/i);
    await expect(errorAlert).toBeVisible({ timeout: 10000 });

    // Link to Sign Up works
    await page.getByRole("link", { name: "Create one" }).click();
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test("Sign-up page enforces validation rules", async ({ page }) => {
    await page.goto("/sign-up");

    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

    const nameInput = page.locator('input[name="name"]');
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    // Fill short password and mismatching confirm password
    await nameInput.fill("A"); // short name
    await emailInput.fill("invalid-email-format");
    await passwordInput.fill("short");
    await confirmPasswordInput.fill("different");

    await page.getByRole("button", { name: /Create account/i }).click();

    // Check validation error messages
    await expect(page.getByText("Name must be at least 2 characters.")).toBeVisible();
    await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();

    // Link back to Sign In
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
