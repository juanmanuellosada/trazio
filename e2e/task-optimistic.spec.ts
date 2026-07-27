import { expect, test } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

const TASKS_PATCH_ROUTE = "**/rest/v1/tasks*";

async function loginFreshUser(page: import("@playwright/test").Page, prefix: string) {
  const email = uniqueEmail(prefix);
  await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });
  await login(page, { email, password: PASSWORD });
}

async function createTask(page: import("@playwright/test").Page, title: string) {
  await page.getByRole("button", { name: "Agregar tarea" }).click();
  const input = page.getByLabel("Título de la nueva tarea");
  await input.fill(title);
  await input.press("Enter");
  const checkbox = page.getByRole("checkbox", { name: `Completar ${title}` });
  await expect(checkbox).toBeVisible();
  return checkbox;
}

test.describe("14.4 — completar se ve instantáneo y revierte si el servidor falla", () => {
  test("(a) el check cambia mientras el PATCH real todavía está en vuelo", async ({ page }) => {
    await loginFreshUser(page, "optimistic-ok");
    const checkbox = await createTask(page, uniqueName("Tarea optimista"));

    // Retiene la respuesta real del PATCH hasta que el test la libera a
    // mano: así se puede probar que el check ya cambió *mientras* la red
    // seguía en vuelo, no solo que la app es "rápida".
    let releaseResponse!: () => void;
    const held = new Promise<void>((resolve) => (releaseResponse = resolve));
    await page.route(TASKS_PATCH_ROUTE, async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue();
        return;
      }
      await held;
      await route.continue();
    });

    await checkbox.click();
    // Si esto tardara más que la retención de arriba, ya no probaría nada:
    // el cambio podría venir de la respuesta real, no del optimistic update.
    await expect(checkbox).toHaveAttribute("aria-checked", "true", { timeout: 300 });

    releaseResponse();
    await expect(checkbox).toHaveAttribute("aria-checked", "true");
    await page.unroute(TASKS_PATCH_ROUTE);
  });

  test("(b) si el PATCH real falla, revierte el check y avisa el error", async ({ page }) => {
    await loginFreshUser(page, "optimistic-fail");
    const checkbox = await createTask(page, uniqueName("Tarea que falla"));

    // Bloquea el PATCH (simula el rechazo del servidor) y también el GET de
    // refetch que dispara `onSettled` al invalidar la query: sin esto, un
    // simple refetch de fondo terminaría mostrando el estado real igual —
    // aunque la reversión explícita del `onError` estuviera rota — y el
    // test no probaría nada. Así, el único camino que puede dejar el check
    // en `false` es la reversión optimista en sí.
    await page.route(TASKS_PATCH_ROUTE, async (route) => {
      const method = route.request().method();
      if (method === "PATCH" || method === "GET") {
        await route.abort("failed");
        return;
      }
      await route.continue();
    });

    // El abort de la ruta es casi instantáneo, así que el estado optimista
    // intermedio ("true") puede no alcanzar a observarse antes de que la
    // reversión ya haya corrido — eso ya lo cubre el test (a). Acá lo que
    // importa es que termine revertido y avisado. El toast de Sonner se
    // autodescarta a los pocos segundos, así que se busca primero (antes de
    // que desaparezca) y recién después se confirma el estado final.
    await checkbox.click();
    await expect(page.getByText(/No pudimos (guardar el cambio|completar la acción)/)).toBeVisible({ timeout: 3_000 });
    await expect(checkbox).toHaveAttribute("aria-checked", "false");

    await page.unroute(TASKS_PATCH_ROUTE);
  });
});
