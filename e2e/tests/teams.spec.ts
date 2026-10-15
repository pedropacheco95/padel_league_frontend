import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Mutual choice forms a pair. Each viewport project uses its own two players,
// because both projects share one database.
const PAIRS: Record<string, [string, string, string, string]> = {
  desktop: ["diogomalafaya", "Malafaya", "bernardocastro", "Bernardo C"],
  "phone-375": ["cucamagalhaes", "Cuca", "talinhobritoefaro", "Talinho"],
};

test("two players choose each other and become a pair", async ({ browser }, info) => {
  const [userA, nameA, userB, nameB] = PAIRS[info.project.name];

  const a = await browser.newPage({ viewport: info.project.use.viewport ?? undefined });
  await login(a, userA);
  await a.goto("/teams");
  await a.getByPlaceholder("Procurar jogador").fill(nameB);
  await a.getByRole("listitem").filter({ hasText: nameB }).getByRole("button", { name: "Escolher", exact: true }).click();
  await expect(a.getByText(`Escolheste ${nameB}`).first()).toBeVisible();
  await a.close();

  const b = await browser.newPage({ viewport: info.project.use.viewport ?? undefined });
  await login(b, userB);
  await b.goto("/teams");
  await b.getByPlaceholder("Procurar jogador").fill(nameA);
  await b.getByRole("listitem").filter({ hasText: nameA }).getByRole("button", { name: "Aceitar", exact: true }).click();
  await expect(b.getByText(`Match feito com ${nameA}`).first()).toBeVisible();
  await b.close();
});
