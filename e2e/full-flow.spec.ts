import { expect, test } from "@playwright/test";
import { registerAndConfirm } from "./helpers/auth";
import { createRootProject, openProject } from "./helpers/projects";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

/**
 * 14.11: registrarse -> crear un proyecto -> crear una tarea escribiendo
 * lenguaje natural en el alta rápida (el parser la tiene que interpretar de
 * verdad, no se llenan campos a mano) -> completarla.
 */
test.describe("14.11 — flujo completo del producto", () => {
  test("registro, proyecto, tarea en lenguaje natural con fecha y prioridad, y completarla", async ({ page }) => {
    const email = uniqueEmail("full-flow");
    const name = uniqueName("Persona");
    await registerAndConfirm(page, { name, email, password: PASSWORD });

    const projectName = uniqueName("Proyecto");
    await createRootProject(page, projectName);
    await openProject(page, projectName);

    // "mañana" en la zona horaria por defecto de la cuenta (B4:
    // America/Argentina/Buenos_Aires), calculada en tiempo real porque el
    // parser corre contra el reloj real de la app, no uno congelado.
    const tomorrow = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));

    await page.getByRole("button", { name: "Agregar tarea" }).click();
    const input = page.getByLabel("Título de la nueva tarea");
    await input.fill("Comprar café mañana p1");
    await input.press("Enter");

    // El parser tiene que haber sacado "mañana" y "p1" del título (caso 2 y
    // 38 de docs/parser-test-cases.md combinados): si esto aparece con el
    // texto completo, el parser no interpretó nada y quedó como texto plano.
    const cleanTitle = "Comprar café";
    const checkbox = page.getByRole("checkbox", { name: `Completar ${cleanTitle}` });
    await expect(checkbox).toBeVisible();

    await page.getByRole("button", { name: cleanTitle, exact: true }).click();
    const detail = page.getByRole("dialog", { name: "Detalle de la tarea" });
    await expect(detail.getByRole("button", { name: /Urgente/ })).toBeVisible();
    await expect(detail.getByRole("textbox", { name: "Vencimiento" })).toHaveValue(tomorrow);

    await detail.getByRole("button", { name: "Cerrar detalle" }).click();

    await checkbox.click();
    await expect(checkbox).toHaveAttribute("aria-checked", "true");
  });
});
