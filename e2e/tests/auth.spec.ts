import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("login stores tokens and shows the signed-in layout", async ({ page }) => {
  await login(page, "pedropacheco");
  await page.goto("/teams");
  await expect(page.getByText("Faz login")).toHaveCount(0);
});

test("an invalid access token is renewed once with the refresh token", async ({ page }) => {
  await login(page, "pedropacheco");
  // Stand-in for a 30-min expiry: the API rejects this token, the client must refresh and retry.
  await page.evaluate(() => localStorage.setItem("accessToken", "expired.invalid.token"));
  const refresh = page.waitForResponse(r => r.url().includes("/auth/refresh") && r.request().method() === "POST");
  await page.goto("/teams");
  expect((await refresh).status()).toBe(200);
  await expect(page.getByText("Faz login")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /PPL Teams/ })).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem("accessToken"));
  expect(token).not.toBe("expired.invalid.token");
});
