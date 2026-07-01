import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("homepage loads with navbar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("login page is reachable", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("registration page is reachable", async ({ page }) => {
    await page.goto("/registrering");
    await expect(page).toHaveURL(/\/registrering/);
  });

  test("mobile menu opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const menuButton = page.getByRole("button", { name: "Åpne meny" });
    await expect(menuButton).toBeVisible();

    await menuButton.click();
    await expect(page.getByRole("navigation", { name: "Mobilnavigasjon" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Mobilnavigasjon" })).not.toBeVisible();
  });
});
