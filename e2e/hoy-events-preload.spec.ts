import { formatInTimeZone } from "date-fns-tz";
import { expect, test, type Page } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { closeSettings, connectGoogleCalendar, enableCalendar, openCalendarsSettings, seedEvent } from "./helpers/calendar";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";

// Cubre la decisión del dueño de precargar los eventos de hoy desde el
// resto de la app (`HoyEventsSeed`, `app/(app)/layout.tsx`) para que Hoy no
// salte al insertarlos (tareas primero, eventos después, 250-300px de
// golpe). Un retraso artificial sobre `/api/calendar/events` hace el salto
// determinístico: contra el mock local, sin retraso, la respuesta es tan
// rápida que "con" y "sin" precarga son indistinguibles a simple vista.

const TZ = "America/Argentina/Buenos_Aires";
const EVENT_SUMMARY = "Reunión de prueba";

async function createTaskOnHoy(page: Page, title: string) {
  await page.getByRole("main").getByRole("button", { name: "Agregar tarea" }).click();
  const input = page.getByLabel("Título de la nueva tarea");
  await input.fill(title);
  await input.press("Enter");
  await expect(page.getByRole("checkbox", { name: `Completar ${title}` })).toBeVisible();
}

/** Usuario con una tarea de hoy y un evento de hoy, Google conectado. Termina en /bandeja. */
async function setupUserWithTodayTaskAndEvent(page: Page): Promise<{ taskTitle: string }> {
  const email = uniqueEmail("hoy-preload-verify");
  await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });
  await login(page, { email, password: PASSWORD });

  await page.goto("/hoy");
  // Sin "hoy" en el título: el quick-add lo interpreta como fecha y lo saca
  // del título (E1 del parser), y la fila ya vence hoy por `defaultDueDate`
  // sin necesidad de escribirlo.
  const taskTitle = uniqueName("Tarea de prueba");
  await createTaskOnHoy(page, taskTitle);

  const { accountId } = await connectGoogleCalendar(page);
  await openCalendarsSettings(page);
  await enableCalendar(page, "Personal");
  await closeSettings(page);
  // `connectGoogleCalendar` deja en /bandeja?calendario=conectado; cerrar
  // Configuración con Escape no navega.

  const todayDate = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  await seedEvent({
    accountId,
    summary: EVENT_SUMMARY,
    // Con hora, para caer en el tramo 2 de `buildHoySequence` (mezclado con
    // tareas por hora) y quedar **arriba** de la tarea sin hora (tramo 3):
    // así insertar el evento empuja la fila de la tarea hacia abajo, que es
    // justo lo que se quiere medir.
    startISO: `${todayDate}T10:00:00-03:00`,
    endISO: `${todayDate}T11:00:00-03:00`,
    timeZone: TZ,
  });

  return { taskTitle };
}

async function delayEventsRequests(page: Page, ms: number) {
  await page.route(/\/api\/calendar\/events\?/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });
}

/**
 * Posición vertical de la fila de la tarea en la pantalla. `scrollHeight` de
 * `main` no sirve acá: con una sola tarea y un solo evento, el contenido
 * nunca desborda el contenedor (`flex-1`, `min-h-dvh`), así que no cambia
 * aunque el evento se inserte arriba y empuje la fila — se comprobó en la
 * práctica, no por lectura del código: la primera versión de este archivo
 * medía `scrollHeight` y la prueba de línea de base (que **tiene** que
 * saltar) daba 720 antes y 720 después. La posición de la fila sí se mueve.
 */
async function taskRowTop(page: Page, title: string): Promise<number> {
  const box = await page.getByRole("checkbox", { name: `Completar ${title}` }).boundingBox();
  if (!box) throw new Error(`No se encontró la fila de "${title}" para medir su posición.`);
  return box.y;
}

test("entrar a Hoy en frío sigue saltando (línea de base sin precarga)", async ({ page }) => {
  test.setTimeout(60_000); // fixture pesada: alta de tarea + OAuth simulado + sembrado de evento + recarga con retraso
  const { taskTitle } = await setupUserWithTodayTaskAndEvent(page);
  await delayEventsRequests(page, 800);

  await page.goto("/hoy");
  await expect(page.getByRole("heading", { name: "Hoy", level: 1 })).toBeVisible();
  const before = await taskRowTop(page, taskTitle);

  await expect(page.getByText(EVENT_SUMMARY)).toBeVisible();
  const after = await taskRowTop(page, taskTitle);

  expect(after).toBeGreaterThan(before);
});

test("entrar a Hoy desde otra pantalla no mueve las filas (con precarga)", async ({ page }) => {
  test.setTimeout(60_000);
  const { taskTitle } = await setupUserWithTodayTaskAndEvent(page);
  await delayEventsRequests(page, 800);

  const eventsRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/calendar\/events\?/.test(request.url())) eventsRequests.push(request.url());
  });

  // Recarga en frío parada en Bandeja: monta `HoyEventsSeed` (vive en el
  // layout privado, no en Hoy) y dispara la consulta de eventos de hoy
  // antes de que el usuario navegue a Hoy.
  await page.reload();
  const preloadResponse = await page.waitForResponse((response) => /\/api\/calendar\/events\?/.test(response.url()));
  expect(preloadResponse.ok()).toBe(true);

  // Navegación por clic (SPA): el layout no se remonta, así que la consulta
  // recién precargada sigue en el caché de TanStack Query al llegar a Hoy.
  await page.getByRole("link", { name: "Hoy" }).click();
  await expect(page.getByRole("heading", { name: "Hoy", level: 1 })).toBeVisible();

  // El evento ya está sin esperar el retraso artificial otra vez: viene del
  // caché, no de una consulta nueva.
  await expect(page.getByText(EVENT_SUMMARY)).toBeVisible();
  const immediate = await taskRowTop(page, taskTitle);

  await page.waitForTimeout(1000);
  const later = await taskRowTop(page, taskTitle);

  expect(later).toBe(immediate);
  // La prueba fuerte: la navegación a Hoy no disparó una segunda consulta.
  // Si `HoyEventsSeed` estuviera mal enganchado (por ejemplo, montado en
  // Hoy mismo en vez de en el layout), esta lista tendría dos entradas: la
  // de la precarga y otra al llegar a Hoy.
  expect(eventsRequests).toHaveLength(1);
});

test("sin Google conectado: Hoy se ve igual, sin avisos ni errores en consola", async ({ page }) => {
  const email = uniqueEmail("hoy-preload-sin-google");
  await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await login(page, { email, password: PASSWORD });
  await page.goto("/bandeja");
  await page.getByRole("link", { name: "Hoy" }).click();
  await expect(page.getByRole("heading", { name: "Hoy", level: 1 })).toBeVisible();

  await expect(page.getByText(/No pudimos cargar tus eventos de hoy/)).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test("con Google caído: un solo aviso al pie, sin duplicar por la precarga", async ({ page }) => {
  test.setTimeout(60_000);
  await setupUserWithTodayTaskAndEvent(page);

  // Simula la falla desde la respuesta de la propia app (no del mock de
  // Google): la ruta siempre responde 200 (`app/api/calendar/events/route.ts`),
  // así que alcanza con reemplazar el cuerpo.
  await page.route(/\/api\/calendar\/events\?/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "unavailable", reason: "transient" }),
    }),
  );

  await page.reload();
  await page.getByRole("link", { name: "Hoy" }).click();
  await expect(page.getByRole("heading", { name: "Hoy", level: 1 })).toBeVisible();

  await expect(
    page.getByText("No pudimos cargar tus eventos de hoy porque Google no respondió. Volvé a intentar en un momento."),
  ).toHaveCount(1);
});
