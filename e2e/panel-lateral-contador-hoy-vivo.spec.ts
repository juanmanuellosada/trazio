import { expect, test, type Page } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

/**
 * Bug `hoy-congelado-en-el-sidebar`: el número junto a "Hoy" en el panel
 * lateral salía de una prop de un Server Component (`app/(app)/layout.tsx`)
 * que nunca se recalculaba en navegación de cliente (un layout de App
 * Router no se vuelve a renderizar entre rutas), así que quedaba congelado
 * durante toda la sesión hasta recargar. Ahora sale de `usePendingTodayCount`
 * (`lib/pending-count/pending-today-count.ts`), el mismo hook vivo que ya
 * sincroniza el título de la pestaña — este test es la prueba fuerte de que
 * el número baja solo: un unit test que solo comprobara "usa el hook" no
 * hubiera detectado el bug (`AppSidebar` ya lo usaba, pero con una prop
 * congelada como valor).
 *
 * El conteo compara contra `before` en vez de un número fijo: una cuenta
 * nueva ya trae un hábito de bienvenida pendiente de hoy, así que el badge
 * no arranca en 0 (comprobado en la corrida). El punto del test no es el
 * valor absoluto, es que sube al crear y baja al completar, sin recargar.
 */
async function hoyBadgeCount(page: Page): Promise<number> {
  const badge = page.locator('aside a[href="/hoy"] span.tabular-nums');
  if ((await badge.count()) === 0) return 0;
  return Number(await badge.first().textContent());
}

test("completar una tarea de hoy baja el contador del panel lateral sin recargar", async ({ page }) => {
  const email = uniqueEmail("sidebar-hoy-vivo");
  await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });
  await login(page, { email, password: PASSWORD });

  await page.goto("/hoy");
  await expect(page.getByRole("heading", { name: "Hoy", level: 1 })).toBeVisible();

  const before = await hoyBadgeCount(page);

  const title = uniqueName("Tarea de prueba");
  await page.getByRole("main").getByRole("button", { name: "Agregar tarea" }).click();
  const input = page.getByLabel("Título de la nueva tarea");
  await input.fill(title);
  await input.press("Enter");
  const checkbox = page.getByRole("checkbox", { name: `Completar ${title}` });
  await expect(checkbox).toBeVisible();

  await expect.poll(() => hoyBadgeCount(page)).toBe(before + 1);

  await checkbox.click();

  await expect.poll(() => hoyBadgeCount(page)).toBe(before);
});
