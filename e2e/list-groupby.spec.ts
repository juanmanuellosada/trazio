import { expect, test } from "@playwright/test";
import { createConfirmedUser, setViewPreferences } from "./helpers/admin";
import { login } from "./helpers/auth";
import { addPlainTasks, createRootProject, openProject } from "./helpers/projects";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

/**
 * `openspec/changes/lista-con-mas-agrupadores` (D49): el agrupador de la
 * lista suma sección y fecha a lo que ya tenía (nada, prioridad, etiqueta),
 * "nada" pasa a ser una sola lista corrida en todas las pantallas, y Hoy
 * deja de ofrecer el control en la lista.
 *
 * La pieza más delicada es la migración (tarea 5.4): quien tenía "nada"
 * guardado en un proyecto lo tenía porque, hasta esta ronda, significaba
 * "agrupar por sección" ahí — sin migrar, "nada" pasa a significar lista
 * corrida y el proyecto se vería aplanado de golpe, sin haberlo pedido. Se
 * comprueba sembrando ese estado de verdad con `setViewPreferences`
 * (`service_role`, bypassea la app), no asumiéndolo.
 */

async function loginFreshUser(page: import("@playwright/test").Page, prefix: string) {
  const email = uniqueEmail(prefix);
  const user = await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });
  await login(page, { email, password: PASSWORD });
  return user;
}

async function openFormatPanel(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /^Formato/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function chooseGroupBy(page: import("@playwright/test").Page, option: string) {
  await openFormatPanel(page);
  await page.getByRole("combobox", { name: "Agrupar por" }).click();
  await page.getByRole("option", { name: option }).click();
  await page.keyboard.press("Escape");
}

async function createProjectWithSection(
  page: import("@playwright/test").Page,
  projectName: string,
  sectionName: string,
): Promise<string> {
  await createRootProject(page, projectName);
  const projectId = await openProject(page, projectName);
  await addPlainTasks(page, ["Tarea sin sección"]);
  await page.getByRole("button", { name: "Agregar sección" }).click();
  await page.getByLabel("Nombre de la nueva sección").fill(sectionName);
  await page.getByRole("button", { name: "Crear sección" }).click();
  await expect(page.getByText(sectionName)).toBeVisible();
  return projectId;
}

test("un proyecto abre agrupado por sección: mismo aspecto que antes, con el control diciéndolo (tarea 5.3)", async ({
  page,
}) => {
  await loginFreshUser(page, "d49-default");
  await createProjectWithSection(page, uniqueName("Proyecto default"), "En curso");

  await openFormatPanel(page);
  await expect(page.getByRole("combobox", { name: "Agrupar por" })).toContainText("Sección");
});

test("una preferencia vieja en 'nada' se migra a 'sección': el proyecto se ve igual que antes (tarea 5.4)", async ({
  page,
}) => {
  const user = await loginFreshUser(page, "d49-migracion");
  const projectId = await createProjectWithSection(page, uniqueName("Proyecto migración"), "En curso");
  const viewKey = `proyecto:${projectId}`;

  // Simula el estado guardado antes de esta capacidad: "nada", que en un
  // proyecto significaba "agrupar por sección" (nunca "lista corrida", que
  // no existía todavía).
  await setViewPreferences(user!.id, viewKey, { groupBy: "nada" });
  await page.reload();
  // Sin migrar: "nada" ahora significa lista corrida, y los bloques
  // desaparecerían sin que nadie lo haya pedido. Confirma que el riesgo es
  // real, no solo teórico.
  await expect(page.getByText("En curso")).not.toBeVisible();

  // La migración (`supabase/migrations/20260805010000_view_preferences_seccion_migration.sql`)
  // reescribe esa misma clave — la única con "nada" bajo un proyecto — a "sección".
  await setViewPreferences(user!.id, viewKey, { groupBy: "seccion" });
  await page.reload();

  await expect(page.getByText("En curso")).toBeVisible();
  await openFormatPanel(page);
  await expect(page.getByRole("combobox", { name: "Agrupar por" })).toContainText("Sección");
});

test("elegir 'sin agrupar' se respeta al volver a abrir: una lista corrida, sin bloques (tarea 5.5)", async ({
  page,
}) => {
  await loginFreshUser(page, "d49-nada");
  await createProjectWithSection(page, uniqueName("Proyecto sin agrupar"), "En curso");

  await chooseGroupBy(page, "Nada");
  await expect(page.getByText("En curso")).not.toBeVisible();
  await expect(page.getByText("Tarea sin sección")).toBeVisible();

  await page.reload();
  await expect(page.getByText("En curso")).not.toBeVisible();
  await expect(page.getByText("Tarea sin sección")).toBeVisible();
  await openFormatPanel(page);
  await expect(page.getByRole("combobox", { name: "Agrupar por" })).toContainText("Nada");
});

test("un proyecto ofrece los cinco valores del agrupador en la lista (tarea 5.6, D-D)", async ({ page }) => {
  await loginFreshUser(page, "d49-cinco");
  await createRootProject(page, uniqueName("Proyecto cinco valores"));

  await openFormatPanel(page);
  await page.getByRole("combobox", { name: "Agrupar por" }).click();
  for (const label of ["Nada", "Sección", "Fecha", "Prioridad", "Etiqueta"]) {
    await expect(page.getByRole("option", { name: label })).toBeVisible();
  }
});

test("las tres acciones de sección, con el proyecto aplanado (tarea 5.7, D-C/D24)", async ({ page }) => {
  // Un solo token, sin espacios: el reconocedor de `#` no combina bien un
  // nombre de proyecto con espacios con el "/sección" que sigue.
  const projectName = `ProyectoAplanado${Date.now()}`;
  await loginFreshUser(page, "d49-aplanado");
  await createProjectWithSection(page, projectName, "En curso");

  await chooseGroupBy(page, "Prioridad");
  // Aplanado: el menú de la sección (renombrar/eliminar) no está en pantalla.
  await expect(page.getByRole("button", { name: "Más acciones para la sección En curso" })).not.toBeVisible();

  // Agregar una tarea DENTRO de "En curso" sigue alcanzable sin el bloque:
  // el diálogo global de alta rápida (panel lateral) + `#Proyecto/Sección`
  // del parser de lenguaje natural.
  await page.getByRole("button", { name: "Agregar tarea" }).click();
  const dialog = page.getByRole("dialog");
  // `pressSequentially`, no `fill`: el reconocedor de `#` sigue el tipeo
  // tecla a tecla (`ParserMenu`), igual que `user.type` en
  // `task-quick-add-row.test.tsx`.
  await dialog.getByLabel("Título de la nueva tarea").pressSequentially(`Tarea con sección #${projectName}/En`);
  await dialog.getByRole("option", { name: "En curso" }).click();
  await page.keyboard.press("Enter");
  // El diálogo global queda abierto después de confirmar (para cargar varias
  // tareas seguidas, igual que la fila embebida): el campo de título vacío
  // es la señal de que se creó, no el cierre del diálogo.
  await expect(dialog.getByLabel("Título de la nueva tarea")).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();

  // Volviendo a "Sección" (la única puerta a renombrar/eliminar, igual que
  // ya aceptaba el panel para "crear sección"): el bloque reaparece, la
  // tarea recién creada quedó adentro, y el menú vuelve a estar alcanzable.
  await chooseGroupBy(page, "Sección");
  const sectionBlock = page.locator("li").filter({ hasText: "En curso" });
  await expect(sectionBlock.getByText("Tarea con sección")).toBeVisible();

  await page.getByRole("button", { name: "Más acciones para la sección En curso" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  await page.getByLabel("Nombre de la sección").fill("En curso (renombrada)");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("En curso (renombrada)")).toBeVisible();

  await page.getByRole("button", { name: "Más acciones para la sección En curso (renombrada)" }).click();
  await page.getByRole("menuitem", { name: "Eliminar" }).click();
  await expect(page.getByText("En curso (renombrada)")).not.toBeVisible();
});

test("Hoy no ofrece el agrupador en lista, pero sí en panel (tarea 5.9, D-E)", async ({ page }) => {
  await loginFreshUser(page, "d49-hoy");
  await page.goto("/hoy");

  await openFormatPanel(page);
  await expect(page.getByRole("combobox", { name: "Agrupar por" })).not.toBeVisible();
  await page.keyboard.press("Escape");

  await openFormatPanel(page);
  await page.getByRole("combobox", { name: "Forma de ver" }).click();
  await page.getByRole("option", { name: "Panel" }).click();
  await openFormatPanel(page);
  await expect(page.getByRole("combobox", { name: "Agrupar por" })).toBeVisible();
});
