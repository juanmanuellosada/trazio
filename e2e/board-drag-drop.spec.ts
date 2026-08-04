import { expect, test, type Locator, type Page } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { addPlainTasks, createRootProject, openProject } from "./helpers/projects";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

/**
 * Reporte del dueño (2026-08-03): en modo panel, soltar una tarjeta la hacía
 * animar de vuelta a su columna de origen y recién después saltar a la
 * columna nueva — el `DragOverlay` de `@dnd-kit` anima por defecto hasta la
 * posición del nodo original. El arreglo (`dropAnimation={null}` en
 * `components/board/board.tsx`) es puramente visual y no se puede afirmar
 * con una prueba de Playwright (la animación vive en el portal del
 * overlay, no en el DOM de cada columna); lo que sí hace falta, y es lo que
 * prueban estos casos, es que soltar una tarjeta **funcione y sea
 * optimista** en los tres agrupadores del panel — si `dropAnimation={null}`
 * dejara la tarjeta esperando la respuesta del servidor para aparecer en su
 * lugar, el arreglo dejaría un hueco peor que la animación que reemplaza.
 * `useMoveTask`/`useUpdateTask` (`lib/tasks/mutations.ts`) ya son
 * optimistas, así que estas pruebas retienen el PATCH real con
 * `page.route` para confirmar que la tarjeta ya está en su columna nueva
 * *mientras la red sigue en vuelo*, no solo "eventualmente" — y que un
 * rechazo del servidor la devuelve y avisa.
 */

const TASKS_PATCH_ROUTE = "**/rest/v1/tasks*";

async function loginFreshUser(page: Page, prefix: string): Promise<void> {
  const email = uniqueEmail(prefix);
  await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });
  await login(page, { email, password: PASSWORD });
}

async function openFormatPanel(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Formato/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function setViewShape(page: Page, shape: "Lista" | "Panel"): Promise<void> {
  await page.getByRole("combobox", { name: "Forma de ver" }).click();
  await page.getByRole("option", { name: shape }).click();
  // Cierra el popover de "Formato" y espera a que termine su transición de
  // salida, o un clic inmediato sobre el tablero de abajo puede chocar con
  // el overlay inerte que todavía lo cubre.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
}

async function setGroupBy(page: Page, option: "Sección" | "Fecha" | "Prioridad"): Promise<void> {
  await page.getByRole("combobox", { name: "Agrupar por" }).click();
  await page.getByRole("option", { name: option }).click();
}

/** Contenedor de una columna del tablero (encabezado + zona de soltar), a partir del texto de su título. */
function boardColumn(page: Page, title: string): Locator {
  return page.getByRole("heading", { level: 3, name: title }).locator("xpath=..");
}

/** Crea una sección desde la columna final del panel (`AddSectionRow`, solo presente agrupando por sección). */
async function createSectionFromPanel(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Agregar sección" }).click();
  await page.getByLabel("Nombre de la nueva sección").fill(name);
  await page.getByRole("button", { name: "Crear sección" }).click();
  await expect(boardColumn(page, name)).toBeVisible();
}

function taskCard(page: Page, taskTitle: string): Locator {
  return page.getByRole("listitem").filter({ has: page.getByRole("button", { name: `Reordenar ${taskTitle}` }) });
}

/**
 * Arrastra el puntero de `start` a `end` en varios tramos, con una pausa
 * corta entre cada uno: el `PointerSensor` de `@dnd-kit` recalcula la
 * colisión (`closestCenter`) en su propio ciclo de render, y bajo carga
 * (varios workers de Playwright corriendo Chromium a la vez) una sucesión
 * de eventos de puntero sin pausas puede llegar más rápido de lo que ese
 * ciclo alcanza a procesar — el `pointerup` final encuentra una colisión
 * todavía desactualizada y el arrastre no se activa, o se suelta sobre la
 * fila o columna de origen.
 */
async function performDrag(page: Page, start: { x: number; y: number }, end: { x: number; y: number }): Promise<void> {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.waitForTimeout(50);
  const chunks = 6;
  for (let i = 1; i <= chunks; i++) {
    await page.mouse.move(start.x + ((end.x - start.x) * i) / chunks, start.y + ((end.y - start.y) * i) / chunks, {
      steps: 5,
    });
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(100);
  await page.mouse.up();
}

/**
 * Arrastra una tarjeta por su manija hasta que quede **centrada** sobre
 * `targetCenter`. El `DragOverlay` conserva, durante todo el arrastre, el
 * offset entre el puntero y la tarjeta que tenía al agarrarla — la manija
 * está cerca del borde izquierdo, así que si el puntero apuntara
 * directamente a `targetCenter`, la copia quedaría corrida hacia la derecha
 * esa misma distancia, y `closestCenter` puede terminar eligiendo la
 * columna vecina en vez de la buscada. Por eso el puntero apunta al punto
 * que, descontado ese offset, deja la tarjeta centrada ahí.
 */
async function dragCard(page: Page, taskTitle: string, targetCenter: { x: number; y: number }): Promise<void> {
  const handle = page.getByRole("button", { name: `Reordenar ${taskTitle}` });
  const card = taskCard(page, taskTitle);
  const handleBox = (await handle.boundingBox())!;
  const cardBox = (await card.boundingBox())!;
  const grabOffsetX = handleBox.x + handleBox.width / 2 - cardBox.x;
  const grabOffsetY = handleBox.y + handleBox.height / 2 - cardBox.y;
  const pointerX = targetCenter.x + grabOffsetX - cardBox.width / 2;
  const pointerY = targetCenter.y + grabOffsetY - cardBox.height / 2;

  await performDrag(
    page,
    { x: handleBox.x + handleBox.width / 2, y: handleBox.y + handleBox.height / 2 },
    { x: pointerX, y: pointerY },
  );
}

/** Arrastra una tarjeta hasta el centro de una columna destino (mover entre columnas). */
async function dragCardToColumn(page: Page, taskTitle: string, targetColumn: Locator): Promise<void> {
  const target = (await targetColumn.boundingBox())!;
  await dragCard(page, taskTitle, { x: target.x + target.width / 2, y: target.y + target.height / 2 });
}

test.describe("modo panel: soltar una tarjeta la deja ahí, sin animar de vuelta al origen", () => {
  test("mover entre columnas por sección: la tarjeta ya está en la columna nueva mientras el PATCH real sigue en vuelo", async ({
    page,
  }) => {
    await loginFreshUser(page, "board-drag-seccion");
    const projectName = uniqueName("Proyecto panel");
    await createRootProject(page, projectName);
    await openProject(page, projectName);

    const taskTitle = uniqueName("Tarea a mover");
    await addPlainTasks(page, [taskTitle]);

    await openFormatPanel(page);
    await setViewShape(page, "Panel");

    await createSectionFromPanel(page, "Hecho");
    const sinSeccion = boardColumn(page, "Sin sección");
    const hecho = boardColumn(page, "Hecho");
    await expect(sinSeccion.getByText(taskTitle)).toBeVisible();

    let releaseResponse!: () => void;
    const held = new Promise<void>((resolve) => (releaseResponse = resolve));
    await page.route(TASKS_PATCH_ROUTE, async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue();
        return;
      }
      await held;
      await route.continue();
    });

    await dragCardToColumn(page, taskTitle, hecho);

    // El PATCH real sigue retenido (no se llamó `releaseResponse` todavía),
    // así que llegar acá prueba el optimistic update sin importar cuánto
    // tarde: no hay ninguna carrera contra la red real posible.
    await expect(hecho.getByText(taskTitle)).toBeVisible();
    await expect(sinSeccion.getByText(taskTitle)).not.toBeVisible();

    releaseResponse();
    // Sigue en la columna nueva después de que el servidor contesta: nunca
    // vuelve a "Sin sección" ni por un instante.
    await expect(hecho.getByText(taskTitle)).toBeVisible();
    await expect(sinSeccion.getByText(taskTitle)).not.toBeVisible();

    await page.unroute(TASKS_PATCH_ROUTE);
  });

  test("mover entre columnas por prioridad: la tarjeta ya está en la columna nueva mientras el PATCH real sigue en vuelo", async ({
    page,
  }) => {
    await loginFreshUser(page, "board-drag-prioridad");
    const projectName = uniqueName("Proyecto prioridad");
    await createRootProject(page, projectName);
    await openProject(page, projectName);

    const taskTitle = uniqueName("Tarea sin prioridad");
    await addPlainTasks(page, [taskTitle]);

    await openFormatPanel(page);
    await setViewShape(page, "Panel");
    await openFormatPanel(page);
    await setGroupBy(page, "Prioridad");
    await page.keyboard.press("Escape");

    // Prioridad por defecto de una tarea nueva: Baja (`DEFAULT_TASK_PRIORITY`).
    const baja = boardColumn(page, "Baja");
    const urgente = boardColumn(page, "Urgente");
    await expect(baja.getByText(taskTitle)).toBeVisible();

    let releaseResponse!: () => void;
    const held = new Promise<void>((resolve) => (releaseResponse = resolve));
    await page.route(TASKS_PATCH_ROUTE, async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue();
        return;
      }
      await held;
      await route.continue();
    });

    await dragCardToColumn(page, taskTitle, urgente);

    // El PATCH real sigue retenido: llegar acá prueba el optimistic update.
    await expect(urgente.getByText(taskTitle)).toBeVisible();
    await expect(baja.getByText(taskTitle)).not.toBeVisible();

    releaseResponse();
    await expect(urgente.getByText(taskTitle)).toBeVisible();
    await expect(baja.getByText(taskTitle)).not.toBeVisible();

    await page.unroute(TASKS_PATCH_ROUTE);
  });

  test("reordenar dentro de una columna: el orden nuevo no vuelve al viejo", async ({ page }) => {
    await loginFreshUser(page, "board-drag-reorder");
    const projectName = uniqueName("Proyecto reordenar");
    await createRootProject(page, projectName);
    await openProject(page, projectName);

    const first = uniqueName("Primera tarea");
    const second = uniqueName("Segunda tarea");
    await addPlainTasks(page, [first, second]);

    await openFormatPanel(page);
    await setViewShape(page, "Panel");

    const sinSeccion = boardColumn(page, "Sin sección");
    await expect(sinSeccion.getByText(first)).toBeVisible();
    await expect(sinSeccion.getByText(second)).toBeVisible();

    let releaseResponse!: () => void;
    const held = new Promise<void>((resolve) => (releaseResponse = resolve));
    await page.route(TASKS_PATCH_ROUTE, async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue();
        return;
      }
      await held;
      await route.continue();
    });

    // Arrastra la manija de la segunda tarea hasta la manija de la primera:
    // las dos están en la misma columna, a la misma distancia del borde
    // izquierdo de su fila, así que el desplazamiento entre una y otra
    // (sin ningún cálculo de offset de por medio) deja la tarjeta arrastrada
    // exactamente donde estaba la primera.
    const secondHandleBox = (await page.getByRole("button", { name: `Reordenar ${second}` }).boundingBox())!;
    const firstHandleBox = (await page.getByRole("button", { name: `Reordenar ${first}` }).boundingBox())!;
    await performDrag(
      page,
      { x: secondHandleBox.x + secondHandleBox.width / 2, y: secondHandleBox.y + secondHandleBox.height / 2 },
      { x: firstHandleBox.x + firstHandleBox.width / 2, y: firstHandleBox.y + firstHandleBox.height / 2 },
    );

    const orderWhileHeld = await sinSeccion.getByRole("listitem").allTextContents();
    expect(orderWhileHeld[0]).toContain(second);
    expect(orderWhileHeld[1]).toContain(first);

    releaseResponse();
    const orderAfterResponse = await sinSeccion.getByRole("listitem").allTextContents();
    expect(orderAfterResponse[0]).toContain(second);
    expect(orderAfterResponse[1]).toContain(first);

    await page.unroute(TASKS_PATCH_ROUTE);
  });

  test("si el servidor rechaza el movimiento, la tarjeta vuelve a su columna original y avisa", async ({ page }) => {
    await loginFreshUser(page, "board-drag-rechazo");
    const projectName = uniqueName("Proyecto rechazo");
    await createRootProject(page, projectName);
    await openProject(page, projectName);

    const taskTitle = uniqueName("Tarea que no se mueve");
    await addPlainTasks(page, [taskTitle]);

    await openFormatPanel(page);
    await setViewShape(page, "Panel");
    await createSectionFromPanel(page, "Hecho");

    const sinSeccion = boardColumn(page, "Sin sección");
    const hecho = boardColumn(page, "Hecho");

    // Bloquea el PATCH real (simula el rechazo del servidor) y el GET de
    // refetch que dispara `onSettled`: sin esto, un refetch de fondo podría
    // dejar la tarjeta bien igual con la reversión rota.
    await page.route(TASKS_PATCH_ROUTE, async (route) => {
      const method = route.request().method();
      if (method === "PATCH" || method === "GET") {
        await route.abort("failed");
        return;
      }
      await route.continue();
    });

    await dragCardToColumn(page, taskTitle, hecho);

    await expect(page.getByText(/No pudimos (guardar el cambio|completar la acción)/)).toBeVisible({ timeout: 3_000 });
    await expect(sinSeccion.getByText(taskTitle)).toBeVisible();
    await expect(hecho.getByText(taskTitle)).not.toBeVisible();

    await page.unroute(TASKS_PATCH_ROUTE);
  });
});
