import { expect, type Page } from "@playwright/test";

/** Crea un proyecto raíz desde el panel lateral (bloque 6.2) y espera a que aparezca en el árbol. */
export async function createRootProject(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await page.getByLabel("Nombre").fill(name);
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  await expect(page.getByRole("link", { name })).toBeVisible();
}

/** Crea `childName` como subproyecto de `parentName` vía "Más acciones" del árbol (bloque 6.3/6.6), no por arrastre. */
export async function createSubproject(page: Page, parentName: string, childName: string): Promise<void> {
  await page.getByRole("button", { name: `Más acciones para ${parentName}` }).click();
  await page.getByRole("menuitem", { name: "Agregar subproyecto" }).click();
  await page.getByLabel("Nombre").fill(childName);
  await page.getByRole("button", { name: "Crear proyecto" }).click();
  await expect(page.getByRole("link", { name: childName })).toBeVisible();
}

/** Navega al proyecto `name` desde el panel lateral y devuelve su id (de la URL `/proyecto/{id}`). */
export async function openProject(page: Page, name: string): Promise<string> {
  await page.getByRole("link", { name }).click();
  await expect(page).toHaveURL(/\/proyecto\/[^/]+$/);
  const match = page.url().match(/\/proyecto\/([^/]+)$/);
  if (!match) throw new Error(`No se pudo leer el id de proyecto de la URL: ${page.url()}`);
  return match[1];
}

/**
 * Agrega `titles.length` tareas simples a la vista de proyecto actual con
 * el alta rápida (bloque 7.2). La primera tarea de un proyecto vacío cambia
 * `ProjectView` del estado vacío (bloque 8.6) a la lista normal, lo que
 * remonta la fila de alta rápida: por eso se reabre con "Agregar tarea"
 * antes de cada título en vez de asumir que el `<input>` sigue siendo el
 * mismo durante todo el bucle.
 */
export async function addPlainTasks(page: Page, titles: string[]): Promise<void> {
  for (const title of titles) {
    const addButton = page.getByRole("button", { name: "Agregar tarea" });
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
    }
    const input = page.getByLabel("Título de la nueva tarea");
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(title);
    await input.press("Enter");
    await expect(page.getByRole("checkbox", { name: `Completar ${title}` })).toBeVisible({ timeout: 10_000 });
  }
}
