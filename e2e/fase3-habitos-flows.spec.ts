import { expect, test } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

/**
 * 6.8: flujo completo de hábitos — crear, marcar, ver la racha, archivar y
 * desarchivar, conservando el historial (spec "Archivar conserva el
 * historial completo"). Mismo patrón que `fase2-flows.spec.ts`: usuario
 * fresco por test, con el helper que crea usuarios ya confirmados sin pasar
 * por Mailpit.
 */

async function loginFreshUser(page: import("@playwright/test").Page, prefix: string) {
  const email = uniqueEmail(prefix);
  await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });
  await login(page, { email, password: PASSWORD });
}

test.describe("6.8 — crear un hábito, marcarlo, ver la racha, archivarlo y desarchivarlo", () => {
  test("el flujo completo conserva la marca de hoy al archivar y desarchivar", async ({ page }) => {
    await loginFreshUser(page, "habito-flow");

    await page.goto("/habitos");
    await page.getByRole("button", { name: "Nuevo hábito" }).click();

    const habitName = uniqueName("Meditar");
    await page.getByLabel("Nombre").fill(habitName);

    await page.getByLabel("Ícono").click();
    const firstEmoji = page.getByRole("option").first();
    await expect(firstEmoji).toBeVisible({ timeout: 10_000 });
    await firstEmoji.click();

    await page.getByLabel("Duración estimada (min)").fill("10");
    await page.getByRole("button", { name: "Crear hábito" }).click();

    const markCheckbox = page.getByRole("checkbox", { name: `Marcar ${habitName} como hecho hoy` });
    await expect(markCheckbox).toBeVisible();

    const card = page.getByRole("listitem").filter({ hasText: habitName });
    await expect(card.getByText("0 días", { exact: true })).toBeVisible();

    // Marcar de hoy: la racha pasa a 1 día, la mejor racha también (tarea 2.4).
    await markCheckbox.click();
    await expect(page.getByRole("checkbox", { name: `Desmarcar ${habitName} de hoy` })).toBeVisible();
    await expect(card.getByText("1 día", { exact: true })).toBeVisible();
    await expect(card.getByText("Mejor: 1 día")).toBeVisible();

    // Archivar (tarea 3.8/6.4): desaparece de la lista activa, sin perder la marca.
    await page.getByRole("button", { name: `Más acciones de ${habitName}` }).click();
    await page.getByRole("menuitem", { name: "Archivar" }).click();
    await expect(page.getByText("Hábito archivado.")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: `Desmarcar ${habitName} de hoy` })).toHaveCount(0);

    await page.getByRole("button", { name: /^Archivados/ }).click();
    const archivedCard = page.getByRole("listitem").filter({ hasText: habitName });
    await expect(archivedCard).toBeVisible();
    await expect(archivedCard.getByText("Mejor: 1 día")).toBeVisible();

    // Desarchivar: vuelve a la lista activa con el historial intacto.
    await page.getByRole("button", { name: `Más acciones de ${habitName}` }).click();
    await page.getByRole("menuitem", { name: "Desarchivar" }).click();
    await expect(page.getByText("Hábito desarchivado.")).toBeVisible();

    await expect(page.getByRole("checkbox", { name: `Desmarcar ${habitName} de hoy` })).toBeVisible();
    const restoredCard = page.getByRole("listitem").filter({ hasText: habitName });
    await expect(restoredCard.getByText("1 día", { exact: true })).toBeVisible();
    await expect(restoredCard.getByText("Mejor: 1 día")).toBeVisible();
  });
});
