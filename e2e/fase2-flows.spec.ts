import { expect, test } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { createRootProject, openProject } from "./helpers/projects";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

/**
 * Cuatro flujos nuevos de la fase 2 (bloque 9.9): guardar un filtro y
 * abrirlo, comentar una tarea, completar una recurrente, y deshacer una
 * eliminación con todo lo que tiene que traer de vuelta. Mismo patrón que
 * el resto de `e2e/`: usuario fresco por test, sin reutilizar cuentas.
 */

async function loginFreshUser(page: import("@playwright/test").Page, prefix: string) {
  const email = uniqueEmail(prefix);
  await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });
  await login(page, { email, password: PASSWORD });
}

/** Alta rápida en la vista de proyecto actual, con lenguaje natural (prioridad, fecha, etc.) en el título. */
async function addTaskWithNaturalLanguage(page: import("@playwright/test").Page, text: string) {
  const trigger = page.getByRole("main").getByRole("button", { name: "Agregar tarea" });
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
  }
  const input = page.getByLabel("Título de la nueva tarea");
  await input.fill(text);
  await input.press("Enter");
}

test.describe("9.9 — guardar un filtro y abrirlo", () => {
  test("un filtro guardado con priority:1 muestra solo la tarea urgente", async ({ page }) => {
    await loginFreshUser(page, "filtro-flow");

    const projectName = uniqueName("Proyecto filtro");
    await createRootProject(page, projectName);
    await openProject(page, projectName);

    await addTaskWithNaturalLanguage(page, "Tarea urgente p1");
    await expect(page.getByRole("checkbox", { name: "Completar Tarea urgente" })).toBeVisible();
    await addTaskWithNaturalLanguage(page, "Tarea de baja prioridad p4");
    await expect(page.getByRole("checkbox", { name: "Completar Tarea de baja prioridad" })).toBeVisible();

    await page.goto("/filtros");
    await page.getByRole("button", { name: "Nuevo filtro" }).click();

    const filterName = uniqueName("Filtro urgentes");
    await page.getByLabel("Nombre").fill(filterName);
    await page.getByLabel("Consulta").fill("priority:1");
    // Vista previa en vivo (bloque 2.16): confirma que la consulta matchea
    // exactamente una tarea antes de guardar el filtro.
    await expect(page.getByText(/^1 tarea coincide/)).toBeVisible();

    await page.getByRole("button", { name: "Crear filtro" }).click();

    // Abrir el filtro guardado desde su propia pantalla de administración.
    const filterLink = page.getByRole("link", { name: filterName });
    await expect(filterLink).toBeVisible();
    await filterLink.click();

    await expect(page).toHaveURL(/\/filtros\/[^/]+$/);
    await expect(page.getByRole("heading", { name: filterName, level: 1 })).toBeVisible();
    await expect(page.getByText("Tarea urgente")).toBeVisible();
    await expect(page.getByText("Tarea de baja prioridad")).toHaveCount(0);
  });
});

test.describe("9.9 — comentar una tarea", () => {
  test("un comentario escrito y confirmado aparece en el hilo", async ({ page }) => {
    await loginFreshUser(page, "comment-flow");

    const projectName = uniqueName("Proyecto comentario");
    await createRootProject(page, projectName);
    await openProject(page, projectName);

    const title = uniqueName("Tarea con comentario");
    await addTaskWithNaturalLanguage(page, title);
    const checkbox = page.getByRole("checkbox", { name: `Completar ${title}` });
    await expect(checkbox).toBeVisible();

    await page.getByRole("button", { name: title, exact: true }).dblclick();
    const detail = page.getByRole("dialog", { name: "Detalle de la tarea" });
    await expect(detail.getByText("Comentarios", { exact: true })).toBeVisible();

    // El composer de comentarios es un campo de texto plano (bloque 4.3,
    // revierte D2 solo para comentarios: `openspec/changes/comentarios-en-texto-plano/`).
    const commentText = "Quedó listo para revisar mañana.";
    await detail.getByRole("textbox", { name: "Nuevo comentario" }).click();
    await page.keyboard.type(commentText);
    await detail.getByRole("button", { name: "Comentar" }).click();

    await expect(detail.getByText(commentText)).toBeVisible();
    // El composer queda vacío después de publicar (bloque 4.3): el botón
    // "Comentar" vuelve a quedar deshabilitado hasta que se escriba algo nuevo.
    await expect(detail.getByRole("button", { name: "Comentar", exact: true })).toBeDisabled();
  });
});

test.describe("9.9 — completar una tarea recurrente", () => {
  test("al completarla se crea la siguiente, heredando prioridad y etiqueta", async ({ page }) => {
    await loginFreshUser(page, "recurring-flow");

    // La etiqueta se crea desde /etiquetas (el selector del detalle solo
    // asigna las que ya existen, no las crea) y se asigna después, para no
    // mezclar la frase de recurrencia con "p2"/"@etiqueta" en el mismo
    // título — el parser de fase 1 no está bajo prueba acá.
    const labelName = uniqueName("recurrentelabel").toLowerCase();
    await page.goto("/etiquetas");
    await page.getByRole("button", { name: "Nueva etiqueta" }).click();
    await page.getByLabel("Nombre").fill(labelName);
    await page.getByRole("button", { name: "Crear etiqueta" }).click();
    await expect(page.getByText(labelName)).toBeVisible();

    const projectName = uniqueName("Proyecto recurrente");
    await createRootProject(page, projectName);
    await openProject(page, projectName);

    const cleanTitle = "Regar las plantas";
    await addTaskWithNaturalLanguage(page, cleanTitle);

    const pendingCheckbox = page.getByRole("checkbox", { name: `Completar ${cleanTitle}`, exact: true });
    await expect(pendingCheckbox).toBeVisible();

    await page.getByRole("button", { name: cleanTitle, exact: true }).dblclick();
    const detail = page.getByRole("dialog", { name: "Detalle de la tarea" });
    await detail.getByRole("button", { name: /^P\d · /}).click();
    await page.getByRole("menuitem", { name: "P2 · Alta" }).click();

    // Repetición por UI (bloque 5.6), no por lenguaje natural: el parser no
    // tiene un patrón para "cada N días" (solo para "cada N semanas"), así
    // que "cada 3 días" del propio ejemplo de design.md no se reconoce
    // todavía — reportado aparte. "Repetir cada 3 día" (intervalo puro, sin
    // BYDAY/BYMONTHDAY/BYMONTH) ancla la próxima ocurrencia en la fecha de
    // completado, sin depender de que la tarea tenga vencimiento (D-D/D-E).
    await detail.getByRole("button", { name: "Repetir tarea" }).click();
    await detail.getByLabel("Intervalo de repetición").fill("3");
    await detail.getByLabel("Frecuencia de la repetición").click();
    await page.getByRole("option", { name: "día" }).click();

    await detail.getByRole("button", { name: "Etiquetas de la tarea" }).click();
    await page.getByRole("option", { name: labelName }).click();
    await page.keyboard.press("Escape");
    await detail.getByRole("button", { name: "Cerrar detalle" }).click();

    await expect(page.getByText(labelName)).toHaveCount(1);

    await pendingCheckbox.click();

    // La completada pasa a "Descompletar" (su aria-label cambia) y una
    // tarea nueva, sin completar, ocupa el lugar de "Completar {cleanTitle}":
    // mismo título, misma prioridad y misma etiqueta heredadas (bloque 5.4).
    await expect(page.getByRole("checkbox", { name: `Descompletar ${cleanTitle}`, exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: `Completar ${cleanTitle}`, exact: true })).toBeVisible();
    await expect(page.getByText(labelName)).toHaveCount(2);
  });
});

test.describe("9.9 — deshacer una eliminación", () => {
  test("Ctrl/Cmd+Z restaura la tarea con su subtarea y su etiqueta", async ({ page }) => {
    await loginFreshUser(page, "undo-flow");

    // La etiqueta se crea desde /etiquetas: el selector del detalle de
    // tarea solo asigna etiquetas que ya existen (label-picker.tsx).
    const labelName = uniqueName("undolabel").toLowerCase();
    await page.goto("/etiquetas");
    await page.getByRole("button", { name: "Nueva etiqueta" }).click();
    await page.getByLabel("Nombre").fill(labelName);
    await page.getByRole("button", { name: "Crear etiqueta" }).click();
    await expect(page.getByText(labelName)).toBeVisible();

    const projectName = uniqueName("Proyecto deshacer");
    await createRootProject(page, projectName);
    await openProject(page, projectName);

    const title = uniqueName("Tarea a borrar");
    await addTaskWithNaturalLanguage(page, title);
    const checkbox = page.getByRole("checkbox", { name: `Completar ${title}` });
    await expect(checkbox).toBeVisible();

    await page.getByRole("button", { name: title, exact: true }).dblclick();
    const detail = page.getByRole("dialog", { name: "Detalle de la tarea" });

    const subtaskTitle = "Subtarea que también vuelve";
    await detail.getByRole("button", { name: "Agregar subtarea" }).click();
    const subtaskInput = detail.getByLabel("Título de la nueva subtarea");
    await subtaskInput.fill(subtaskTitle);
    await subtaskInput.press("Enter");
    await expect(detail.getByText(subtaskTitle)).toBeVisible();

    await detail.getByRole("button", { name: "Etiquetas de la tarea" }).click();
    await page.getByRole("option", { name: labelName }).click();
    await page.keyboard.press("Escape");
    await expect(detail.getByText(labelName)).toBeVisible();

    await detail.getByRole("button", { name: "Cerrar detalle" }).click();

    await page.getByRole("button", { name: `Más acciones para ${title}` }).click();
    await page.getByRole("menuitem", { name: "Eliminar" }).click();
    await expect(page.getByText("Tarea eliminada.")).toBeVisible();
    await expect(checkbox).toHaveCount(0);

    await page.keyboard.press("Control+z");

    await expect(checkbox).toBeVisible();
    await expect(page.getByText(subtaskTitle)).toBeVisible();
    await expect(page.getByText(labelName)).toBeVisible();
  });
});
