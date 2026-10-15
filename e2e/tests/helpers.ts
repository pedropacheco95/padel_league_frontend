import { expect, Page } from "@playwright/test";

export const PASSWORD = "e2e-pass";

export async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("refreshToken"))).not.toBeNull();
}
