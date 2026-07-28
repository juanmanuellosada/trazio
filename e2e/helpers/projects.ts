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
  // Esperar el `<h1>` del proyecto destino, no solo la URL: la navegación
  // entre proyectos es del lado del cliente, y el cambio de URL puede
  // resolverse un instante antes de que el árbol del proyecto anterior
  // termine de desmontarse — sin esto, un locator global como
  // `getByLabel("Título de la nueva tarea")` puede encontrar por un
  // instante el composer, todavía montado, del proyecto que se está dejando.
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  const match = page.url().match(/\/proyecto\/([^/]+)$/);
  if (!match) throw new Error(`No se pudo leer el id de proyecto de la URL: ${page.url()}`);
  return match[1];
}

/**
 * Agrega `titles.length` tareas simples a la vista de proyecto actual con
 * el alta rápida (bloque 5/7.2). La primera tarea de un proyecto vacío
 * cambia `ProjectView` del estado vacío (bloque 8.6) a la lista normal, lo
 * que remonta la fila de alta rápida colapsada: por eso se abre con
 * "Agregar tarea" antes de la primera. De ahí en más, el composer del
 * bloque 5 queda abierto solo después de confirmar (bloque 5, "cargar
 * varias tareas seguidas sin tocar el mouse"), así que no hace falta
 * reabrirlo — y no conviene intentarlo: el botón de confirmar del
 * composer abierto se llama, a propósito, igual que el trigger colapsado
 * ("Agregar tarea", el mismo texto que "Agregar subtarea" para
 * subtareas), así que clickearlo con el campo de título ya visible
 * dispararía el confirmar en vez de un segundo "abrir" — con el título
 * vacío en este punto del bucle, eso cancela el composer en lugar de
 * crear nada. Por eso se decide por la presencia del `<input>`, no del
 * botón.
 */
export async function addPlainTasks(page: Page, titles: string[]): Promise<void> {
  // Scoped a `main` por la misma razón que el botón: el diálogo de "Agregar
  // tarea" del panel lateral (bloque 10.2) monta el mismo composer, con el
  // mismo `aria-label`, si quedara abierto.
  const input = page.getByRole("main").getByLabel("Título de la nueva tarea");
  for (const title of titles) {
    if (!(await input.isVisible().catch(() => false))) {
      // Scoped a `main`: el panel lateral tiene su propio botón "Agregar
      // tarea" (bloque 10.2, siempre en el DOM), homónimo del que abre
      // `TaskQuickAddRow` en la vista actual.
      await page.getByRole("main").getByRole("button", { name: "Agregar tarea" }).click();
    }
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(title);
    await input.press("Enter");
    await expect(page.getByRole("checkbox", { name: `Completar ${title}` })).toBeVisible({ timeout: 10_000 });
  }
}
