import { test, expect } from "@playwright/test";

test.describe("Setup Page", () => {
  test("should display the setup form with all required fields", async ({
    page,
  }) => {
    await page.goto("/setup");

    // Verify the setup page heading or card is visible
    await expect(
      page.getByRole("heading", { name: /create.*admin|setup/i }),
    ).toBeVisible();

    // Verify form fields are present with expected placeholders
    await expect(page.getByPlaceholder("Your name")).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();

    // Verify the submit button
    await expect(
      page.getByRole("button", { name: "Create admin account" }),
    ).toBeVisible();
  });

  test("should show validation errors for empty form submission", async ({
    page,
  }) => {
    await page.goto("/setup");

    // Click submit without filling in anything
    await page.getByRole("button", { name: "Create admin account" }).click();

    // Expect HTML5 validation or custom error — the name field should be required
    const nameInput = page.getByPlaceholder("Your name");
    await expect(nameInput).toBeVisible();

    // Check the field is marked invalid (HTML5 required validation)
    const isInvalid = await nameInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test("should accept valid input in all fields", async ({ page }) => {
    await page.goto("/setup");

    await page.getByPlaceholder("Your name").fill("Admin User");
    await page.getByPlaceholder("you@example.com").fill("admin@howlboard.dev");
    await page.getByPlaceholder("••••••••").fill("SecureP@ss123");

    // Verify the button is enabled and clickable
    const submitButton = page.getByRole("button", {
      name: "Create admin account",
    });
    await expect(submitButton).toBeEnabled();
  });
});
