import { expect, test } from "@playwright/test";
import { createConfirmedUser } from "./helpers/admin";
import { login } from "./helpers/auth";
import { PASSWORD, uniqueEmail, uniqueName } from "./helpers/users";
import {
  closeSettings,
  connectGoogleCalendar,
  enableCalendar,
  openCalendarsSettings,
  openCalendarView,
  readMockEvents,
  seedRecurringEvent,
} from "./helpers/calendar";

/**
 * Tarea 8.11: los flujos de calendario que quedaron sin e2e. Cubre lo que
 * la costura (`GOOGLE_API_BASE_URL`, `lib/calendar/google-client.ts`) hace
 * posible por primera vez — conectar, ver eventos en la grilla, crear uno y
 * arrastrarlo, y la pregunta de alcance sobre una serie recurrente — contra
 * el servidor simulado de `e2e/helpers/google-calendar-mock-server.ts`, no
 * contra Google real.
 *
 * Lo que esto NO prueba (ya verificado contra Google real, ver tarea 8.9/8.10
 * en `openspec/changes/fase-4-calendario/tasks.md`): que el aviso de
 * reconexión aparezca, que las tareas/hábitos de Trazio nunca se publiquen a
 * Google, y que `calendars.delete` borre el calendario de la cuenta entera.
 * Estos tests son para que lo ya verificado siga funcionando, no para
 * descubrirlo de nuevo.
 */

async function loginFreshUser(page: import("@playwright/test").Page, prefix: string) {
  const email = uniqueEmail(prefix);
  await createConfirmedUser({ email, password: PASSWORD, fullName: uniqueName("Persona") });
  await login(page, { email, password: PASSWORD });
}

test.describe("8.11 — conectar, ver eventos, crear uno y arrastrarlo", () => {
  test("conectar deja ver la grilla vacía, crear un evento sin recargar y arrastrarlo a otro horario", async ({ page }) => {
    await loginFreshUser(page, "calendario-flow");

    const { accountId } = await connectGoogleCalendar(page);

    // La vuelta del "consentimiento" es una navegación de servidor de
    // punta a punta (redirects reales, no ruteo de cliente): el modal de
    // Configuración se cierra con ella, hay que volver a abrirlo para ver
    // el estado ya conectado.
    await openCalendarsSettings(page);
    await expect(page.getByText("Conectado con Google")).toBeVisible();
    await expect(page.getByText("Personal", { exact: true })).toBeVisible();

    await enableCalendar(page, "Personal");
    await closeSettings(page);

    await openCalendarView(page);

    // Sidebar "Agregar evento" (bloque 7.6): el mismo diálogo que "crear
    // arrastrando sobre espacio vacío", disponible desde cualquier pantalla.
    const eventTitle = uniqueName("Reunión con el equipo");
    await page.getByRole("button", { name: "Agregar evento" }).click();
    await page.getByLabel("Título").fill(eventTitle);
    await page.getByRole("button", { name: "Crear evento" }).click();

    // Bug real de la verificación (tarea 8.11): un evento creado no
    // aparecía hasta recargar porque `useCreateEvent` no invalidaba la
    // query de rango. Sin ningún `page.reload()` acá: si el bug volviera,
    // este `expect` fallaría por timeout.
    const eventButton = page.getByRole("button", { name: eventTitle });
    await expect(eventButton).toBeVisible();

    const before = (await readMockEvents(accountId)).find((e) => e.summary === eventTitle);
    expect(before).toBeTruthy();
    const originalStart = new Date(before!.start.dateTime!);

    // Arrastrar dos horas más tarde, con ajuste a 15 minutos (tarea 8.4):
    // 96px a 48px por hora son exactamente 2 horas, ya un múltiplo de 15
    // minutos, así que el resultado esperado no depende del redondeo.
    await eventButton.scrollIntoViewIfNeeded();
    const box = (await eventButton.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 96, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByText("Evento editado.")).toBeVisible();

    await expect(async () => {
      const after = (await readMockEvents(accountId)).find((e) => e.summary === eventTitle);
      expect(after).toBeTruthy();
      const newStart = new Date(after!.start.dateTime!);
      expect(newStart.getTime() - originalStart.getTime()).toBe(2 * 60 * 60 * 1000);
    }).toPass();
  });
});

test.describe("8.11 — la pregunta de alcance sobre una serie recurrente", () => {
  test("elegir 'esta ocurrencia' solo cambia una instancia; elegir 'todas' sobrescribe incluso la que ya se había editado sola", async ({
    page,
  }) => {
    await loginFreshUser(page, "calendario-recurrente-flow");

    const { accountId } = await connectGoogleCalendar(page);
    await openCalendarsSettings(page);
    await enableCalendar(page, "Personal");
    await closeSettings(page);

    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    await seedRecurringEvent({
      accountId,
      summary: "Reunión semanal",
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      timeZone: "America/Argentina/Buenos_Aires",
      rrule: "RRULE:FREQ=WEEKLY;COUNT=3",
    });

    await openCalendarView(page);

    // "Esta ocurrencia": solo la instancia elegida cambia.
    await page.getByRole("button", { name: "Reunión semanal" }).click();
    await page.getByLabel("Título").fill("Reunión con cliente");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await page.getByRole("radio", { name: "Esta ocurrencia" }).click();
    await page.getByRole("button", { name: "Editar", exact: true }).click();

    await expect(async () => {
      const events = await readMockEvents(accountId);
      const edited = events.filter((e) => e.summary === "Reunión con cliente");
      const untouched = events.filter((e) => e.summary === "Reunión semanal");
      expect(edited.length).toBe(1);
      expect(untouched.length).toBe(2);
    }).toPass();

    // "Todas": el matiz que la verificación contra Google real descubrió —
    // también sobrescribe la ocurrencia ya editada individualmente arriba,
    // no solo las que seguían con el título original.
    await page.getByRole("button", { name: "Reunión con cliente" }).click();
    await page.getByLabel("Título").fill("Reunión de equipo");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await page.getByRole("radio", { name: "Todas" }).click();
    await page.getByRole("button", { name: "Editar", exact: true }).click();

    await expect(async () => {
      const events = await readMockEvents(accountId);
      expect(events.length).toBe(3);
      expect(events.every((e) => e.summary === "Reunión de equipo")).toBe(true);
    }).toPass();
  });
});
