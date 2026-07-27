import { expect, test } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

test.describe("14.6 — sin internet avisa y no permite escribir", () => {
  test("el cartel aparece, la escritura queda bloqueada, y todo se recupera al volver la conexión", async ({
    page,
    context,
  }) => {
    const email = uniqueEmail("offline");
    await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });
    await login(page, { email, password: PASSWORD });

    const addButton = page.getByRole("button", { name: "Agregar tarea" });
    await expect(addButton).toBeVisible();

    const banner = page.getByRole("alert").filter({ hasText: "Estás sin conexión" });
    await expect(banner).toBeHidden();

    await context.setOffline(true);
    await expect(banner).toBeVisible();

    // Dos pruebas de que "no permite escribir", no solo que el cartel está
    // visible: (1) el botón que abre el alta rápida queda debajo de un
    // contenedor `inert` (el mecanismo real de `OfflineBoundary`, no un
    // `disabled` puesto a mano), y (2) un intento de click de verdad no
    // logra activarlo — `inert` bloquea los eventos de puntero, así que ni
    // siquiera se llega a escribir nada.
    const isInert = await addButton.evaluate((el) => el.closest("[inert]") !== null);
    expect(isInert, "el botón de agregar tarea tiene que quedar dentro de un contenedor `inert`").toBe(true);

    await expect(addButton.click({ trial: true, timeout: 1_500 })).rejects.toThrow();
    await expect(page.getByLabel("Título de la nueva tarea")).toHaveCount(0);

    await context.setOffline(false);
    await expect(banner).toBeHidden();

    const isInertAfter = await addButton.evaluate((el) => el.closest("[inert]") !== null);
    expect(isInertAfter, "al reconectar, el contenedor `inert` tiene que desaparecer").toBe(false);

    await addButton.click();
    const input = page.getByLabel("Título de la nueva tarea");
    const title = uniqueName("Tarea tras reconectar");
    await input.fill(title);
    await input.press("Enter");
    await expect(page.getByRole("checkbox", { name: `Completar ${title}` })).toBeVisible();
  });
});
