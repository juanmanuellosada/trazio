import { expect, test } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

const SYNC_THRESHOLD_MS = 2_000;

test.describe("14.5 — un cambio en una pestaña aparece en otra en menos de dos segundos", () => {
  test("crear una tarea en un contexto la muestra en el otro por Realtime", async ({ browser }) => {
    const email = uniqueEmail("realtime");
    await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    try {
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      await login(pageA, { email, password: PASSWORD });
      await login(pageB, { email, password: PASSWORD });

      const title = uniqueName("Sincronizada");

      const start = Date.now();
      // Scoped a `main`: el panel lateral tiene su propio botón homónimo
      // "Agregar tarea" (bloque 10.2).
      await pageA.getByRole("main").getByRole("button", { name: "Agregar tarea" }).click();
      const input = pageA.getByLabel("Título de la nueva tarea");
      await input.fill(title);
      await input.press("Enter");

      // Timeout de espera generoso (para no confundir "todavía no llegó" con
      // "nunca va a llegar"), pero la aserción real de umbral es la de abajo:
      // si tarda más de 2s, el test falla igual, con el tiempo real en el mensaje.
      await expect(pageB.getByText(title)).toBeVisible({ timeout: 8_000 });
      const elapsedMs = Date.now() - start;

      expect(elapsedMs, `tardó ${elapsedMs}ms en aparecer en la otra pestaña (umbral: ${SYNC_THRESHOLD_MS}ms)`).toBeLessThan(
        SYNC_THRESHOLD_MS,
      );
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
