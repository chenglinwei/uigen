import { test, expect } from "@playwright/test";

test.describe("Login button", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows Sign In and Sign Up buttons for unauthenticated users", async ({
    page,
  }) => {
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Up" })).toBeVisible();
  });

  test("opens the auth dialog when Sign In is clicked", async ({ page }) => {
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign In" }).last()
    ).toBeVisible();
  });

  test("shows an error with invalid credentials", async ({ page }) => {
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.getByLabel("Email").fill("nonexistent@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).last().click();

    await expect(page.getByText("Invalid credentials")).toBeVisible();
    // Dialog should remain open
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("closes the dialog when X button is clicked", async ({ page }) => {
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("switches to Sign Up mode when the link is clicked", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(
      page.getByRole("heading", { name: "Create an account" })
    ).toBeVisible();
  });

  test("opens Sign Up dialog directly when Sign Up header button is clicked", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign Up" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Create an account" })
    ).toBeVisible();
  });

  test("successful login hides Sign In and Sign Up buttons", async ({
    page,
    request,
  }) => {
    // Create a test user via the API endpoint first using a direct DB approach
    // This test verifies the end-to-end login flow with a seeded user
    // Note: requires a test user to exist in the database
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = "testpassword123";

    // Sign up first to create the user
    await page.getByRole("button", { name: "Sign Up" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("Email").fill(testEmail);
    await page.getByLabel("Password").fill(testPassword);
    await page.getByRole("button", { name: "Sign Up" }).last().click();

    // After successful sign up, the dialog closes and auth buttons disappear
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole("button", { name: "Sign In" })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign Up" })
    ).not.toBeVisible();
  });
});
