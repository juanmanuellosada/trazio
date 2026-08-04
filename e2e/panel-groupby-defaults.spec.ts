import { expect, test } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { addPlainTasks, createRootProject, openProject } from "./helpers/projects";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

/**
 * D48 (corrección del dueño 2026-08-03): el panel deja de ofrecer "nada"
 * como agrupador — cada pantalla tiene un default explícito (sección en
 * Bandeja/Proyecto, fecha en Próximos, prioridad en Hoy). Confirma que
 * quien ya tenía "nada" guardado (el default histórico) ve exactamente lo
 * mismo que antes en el panel, solo que el control ahora lo llama por su
 * nombre, y que ir y volver entre lista y panel no pisa ninguna de las dos
 * preferencias guardadas.
 */

async function loginFreshUser(page: import("@playwright/test").Page, prefix: string) {
  const email = uniqueEmail(prefix);
  await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });
  await login(page, { email, password: PASSWORD });
}

async function openFormatPanel(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /^Formato/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function setViewShape(page: import("@playwright/test").Page, shape: "Lista" | "Panel") {
  await page.getByRole("combobox", { name: "Forma de ver" }).click();
  await page.getByRole("option", { name: shape }).click();
}

test("el panel de un proyecto se ve igual (columnas por sección), con el control diciendo 'Sección'", async ({
  page,
}) => {
  await loginFreshUser(page, "d48-proyecto");

  const projectName = uniqueName("Proyecto D48");
  await createRootProject(page, projectName);
  await openProject(page, projectName);
  // Un proyecto vacío muestra el estado vacío genérico, sin "Agregar
  // sección" (esa acción vive en `SectionList`, que solo se monta cuando
  // el proyecto ya tiene algo) — una tarea alcanza para salir de ahí.
  await addPlainTasks(page, ["Tarea de prueba"]);

  // Crear una sección desde la lista (viewShape por defecto).
  await page.getByRole("button", { name: "Agregar sección" }).click();
  await page.getByLabel("Nombre de la nueva sección").fill("En curso");
  await page.getByRole("button", { name: "Crear sección" }).click();
  await expect(page.getByText("En curso")).toBeVisible();

  await openFormatPanel(page);
  await setViewShape(page, "Panel");
  // El popover se cierra al elegir la forma de ver; volver a abrirlo.
  await openFormatPanel(page);

  // El agrupador nunca se tocó (queda en el default "nada"): en panel debe
  // mostrarse como "Sección", nunca como "Nada".
  await expect(page.getByRole("combobox", { name: "Agrupar por" })).toContainText("Sección");
  await page.keyboard.press("Escape");

  // La columna de la sección creada tiene que seguir apareciendo, exactamente
  // como antes de D48 (cuando el control decía "Nada").
  await expect(page.getByText("En curso")).toBeVisible();
  await expect(page.getByText("Sin sección")).toBeVisible();

  // Ida y vuelta: la lista tiene que seguir encontrando "nada" intacto (se
  // sigue mostrando "Nada" ahí, donde no es redundante).
  await openFormatPanel(page);
  await setViewShape(page, "Lista");
  await openFormatPanel(page);
  await expect(page.getByRole("combobox", { name: "Agrupar por" })).toContainText("Nada");
  await page.keyboard.press("Escape");

  // Volver a panel: sigue en "Sección", nada se pisó en el camino.
  await openFormatPanel(page);
  await setViewShape(page, "Panel");
  await openFormatPanel(page);
  await expect(page.getByRole("combobox", { name: "Agrupar por" })).toContainText("Sección");
});

test("el panel de Próximos dice 'Fecha' y el de Hoy dice 'Prioridad'", async ({ page }) => {
  await loginFreshUser(page, "d48-proximos-hoy");

  await page.goto("/proximos");
  await openFormatPanel(page);
  await setViewShape(page, "Panel");
  await openFormatPanel(page);
  await expect(page.getByRole("combobox", { name: "Agrupar por" })).toContainText("Fecha");
  await page.keyboard.press("Escape");
  // Las columnas de la ventana siguen apareciendo, igual que antes de D48.
  await expect(page.getByText("Hoy", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Sin fecha")).toBeVisible();

  await page.goto("/hoy");
  await openFormatPanel(page);
  await setViewShape(page, "Panel");
  await openFormatPanel(page);
  await expect(page.getByRole("combobox", { name: "Agrupar por" })).toContainText("Prioridad");
  await page.keyboard.press("Escape");
  // Las cuatro columnas de prioridad siguen apareciendo.
  await expect(page.getByText("Urgente", { exact: true })).toBeVisible();
  await expect(page.getByText("Alta", { exact: true })).toBeVisible();
  await expect(page.getByText("Media", { exact: true })).toBeVisible();
  await expect(page.getByText("Baja", { exact: true })).toBeVisible();
});
