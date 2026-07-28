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

    // Scoped a `main`: el panel lateral tiene su propio botón homónimo
    // "Agregar tarea" (bloque 10.2).
    await page.getByRole("main").getByRole("button", { name: "Agregar tarea" }).click();
    const input = page.getByLabel("Título de la nueva tarea");
    await input.fill("Comprar café mañana p1");
    await input.press("Enter");

    // El parser tiene que haber sacado "mañana" y "p1" del título (caso 2 y
    // 38 de docs/parser-test-cases.md combinados): si esto aparece con el
    // texto completo, el parser no interpretó nada y quedó como texto plano.
    const cleanTitle = "Comprar café";
    const checkbox = page.getByRole("checkbox", { name: `Completar ${cleanTitle}` });
    await expect(checkbox).toBeVisible();

    // Abrir el detalle pide un doble clic real de mouse desde el bloque 6
    // (un clic simple ya no alcanza, para no competir con la selección de
    // texto ni con arrastrar la fila): `.dblclick()`, no `.click()`. El
    // nombre accesible del botón del título incluye la metadata (acá,
    // "mañana") desde el bloque 3 (design.md C1: la fecha ahora vive
    // pegada al título dentro del mismo botón, no como hermano suyo). Es
    // "mañana" en la zona horaria por defecto de la cuenta (B4:
    // America/Argentina/Buenos_Aires) sin necesidad de calcularlo a mano:
    // el parser corre contra el reloj real, y a menos de una semana
    // `formatTaskDueLabel` siempre usa lenguaje natural.
    await page.getByRole("button", { name: `${cleanTitle} mañana`, exact: true }).dblclick();
    // El detalle es un modal centrado (D28), no el panel lateral de antes:
    // se verifica que abre como diálogo y que sus selectores propios (no
    // `<input type="date">`) reflejan lo que reconoció el parser.
    const detail = page.getByRole("dialog", { name: "Detalle de la tarea" });
    await expect(detail.getByRole("button", { name: /Urgente/ })).toBeVisible();
    await expect(detail.getByRole("button", { name: "Fecha de vencimiento" })).toHaveText("mañana");

    await detail.getByRole("button", { name: "Cerrar detalle" }).click();

    await checkbox.click();
    await expect(checkbox).toHaveAttribute("aria-checked", "true");
  });
});
