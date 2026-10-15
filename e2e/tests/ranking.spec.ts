import { expect, test } from "@playwright/test";

// Backup of 15 Oct: Malafaya leads with 5647 points (golden parity capture players_ranking).
test("ranking page lists the leader first", async ({ page }) => {
  await page.goto("/players");
  await expect(page.getByText("Malafaya").first()).toBeVisible();
  await expect(page.getByText("5647").first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "no horizontal page scroll").toBeLessThanOrEqual(1);
});
