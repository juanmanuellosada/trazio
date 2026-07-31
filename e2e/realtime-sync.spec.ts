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

  // Regresión del bug de `replica identity default`: un DELETE solo manda la
  // PK al WAL, sin `user_id`, así que el filtro `user_id=eq.<uuid>` de cada
  // canal no se puede evaluar y Realtime descarta el evento en silencio
  // (D37 de docs/decisions.md). Este test falla si alguien vuelve a
  // `replica identity default` en `tasks`.
  test("borrar una tarea en un contexto la quita del otro por Realtime, sin recargar", async ({ browser }) => {
    const email = uniqueEmail("realtime-delete");
    await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    try {
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      await login(pageA, { email, password: PASSWORD });
      await login(pageB, { email, password: PASSWORD });

      const title = uniqueName("Para borrar");

      await pageA.getByRole("main").getByRole("button", { name: "Agregar tarea" }).click();
      const input = pageA.getByLabel("Título de la nueva tarea");
      await input.fill(title);
      await input.press("Enter");

      // Espera a que el insert llegue a la otra pestaña antes de borrar.
      await expect(pageB.getByText(title)).toBeVisible({ timeout: 8_000 });

      await pageA.getByRole("button", { name: `Más acciones para ${title}` }).click();
      await pageA.getByRole("menuitem", { name: "Eliminar" }).click();
      await expect(pageA.getByText("Tarea eliminada.")).toBeVisible();

      await expect(pageB.getByText(title)).toHaveCount(0, { timeout: 8_000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  // Mismo bug, caso concreto que lo destapó: desmarcar un hábito completado
  // es un UPDATE (no un DELETE) sobre `habit_completions`, pero el fix es el
  // mismo — `replica identity full` en la tabla que el canal filtra por
  // `user_id`.
  test("desmarcar un hábito en un contexto se refleja en el otro por Realtime, sin recargar", async ({ browser }) => {
    const email = uniqueEmail("realtime-habit");
    await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    try {
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      await login(pageA, { email, password: PASSWORD });
      await login(pageB, { email, password: PASSWORD });

      const habitName = uniqueName("Meditar");

      await pageA.goto("/habitos");
      await pageA.getByRole("button", { name: "Nuevo hábito" }).click();
      await pageA.getByLabel("Nombre").fill(habitName);
      await pageA.getByLabel("Ícono").click();
      const firstEmoji = pageA.getByRole("option").first();
      await expect(firstEmoji).toBeVisible({ timeout: 10_000 });
      await firstEmoji.click();
      await pageA.getByLabel("Duración estimada (min)").fill("10");
      await pageA.getByRole("button", { name: "Crear hábito" }).click();

      const markCheckboxA = pageA.getByRole("checkbox", { name: `Marcar ${habitName} como hecho hoy` });
      await expect(markCheckboxA).toBeVisible();

      // pageB entra a /hábitos recién ahora: la creación del hábito no es lo
      // que este test verifica, solo necesita que exista en ambas pestañas
      // antes de marcar/desmarcar.
      await pageB.goto("/habitos");
      await expect(pageB.getByRole("checkbox", { name: `Marcar ${habitName} como hecho hoy` })).toBeVisible();

      await markCheckboxA.click();
      const unmarkCheckboxB = pageB.getByRole("checkbox", { name: `Desmarcar ${habitName} de hoy` });
      await expect(unmarkCheckboxB).toBeVisible({ timeout: 8_000 });

      // El caso que destapó el bug: desmarcar en A tiene que llegar a B.
      await pageA.getByRole("checkbox", { name: `Desmarcar ${habitName} de hoy` }).click();
      await expect(pageB.getByRole("checkbox", { name: `Marcar ${habitName} como hecho hoy` })).toBeVisible({
        timeout: 8_000,
      });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
