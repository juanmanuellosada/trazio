import type { Page } from "@playwright/test";
import { MOCK_GOOGLE_BASE_URL } from "./google-calendar-mock-config";

/** Abre el modal de Configuración (`components/settings/settings-modal.tsx`) ya en la sección "Calendarios". */
export async function openCalendarsSettings(page: Page) {
  await page.goto("/configuracion");
  await page.getByRole("button", { name: "Calendarios" }).click();
}

/**
 * Conecta la cuenta de Google a través del flujo real (tarea 8.11): clic en
 * "Conectar con Google" y de punta a punta por `/api/auth/google` → mock
 * `/o/oauth2/v2/auth` (`google-calendar-mock-server.ts`) →
 * `/api/auth/google/callback` → `/bandeja?calendario=conectado`. El mock
 * reusa el `state` de la navegación (protección CSRF de
 * `lib/calendar/oauth-state.ts`) como `code` y como id de cuenta simulada:
 * capturarlo acá es lo que le permite a un test sembrar datos (
 * `seedRecurringEvent`) sin que el servidor le exponga el access token real
 * a nadie.
 */
export async function connectGoogleCalendar(page: Page): Promise<{ accountId: string }> {
  await openCalendarsSettings(page);

  const [authRequest] = await Promise.all([
    page.waitForRequest((request) => request.url().startsWith(`${MOCK_GOOGLE_BASE_URL}/o/oauth2/v2/auth`)),
    page.getByRole("link", { name: "Conectar con Google" }).click(),
  ]);
  const accountId = new URL(authRequest.url()).searchParams.get("state");
  if (!accountId) throw new Error("El mock de Google no recibió un `state` en la navegación de autorización.");

  await page.waitForURL(/\/bandeja\?calendario=conectado/);
  return { accountId };
}

/** Habilita un calendario ya conectado: sin esto no aparece ningún evento en la grilla (`enabled_calendar_ids` arranca vacío, tarea 2.7). */
export async function enableCalendar(page: Page, calendarSummary: string) {
  await page.getByRole("checkbox", { name: `Mostrar ${calendarSummary} en Trazio` }).click();
}

/** Cierra el modal de Configuración (los diálogos se cierran con `Escape`, `.claude/rules/frontend.md`). */
export async function closeSettings(page: Page) {
  await page.keyboard.press("Escape");
}

/** Cambia Próximos a la vista de calendario (`options.viewShape === "calendario"`, `components/tasks/proximos-view.tsx`). */
export async function openCalendarView(page: Page) {
  await page.goto("/proximos");
  await page.getByRole("radio", { name: "Ver en calendario" }).click();
}

/**
 * Siembra una serie recurrente directo en el mock (tarea 8.11): no hay forma
 * de crear una serie recurrente desde la interfaz de Trazio (`CreateEventDialog`
 * no tiene campo de recurrencia) — un evento así solo puede venir de haberse
 * creado en Google mismo, que es exactamente lo que esto simula.
 */
export async function seedRecurringEvent(options: {
  accountId: string;
  calendarId?: string;
  summary: string;
  startISO: string;
  endISO: string;
  timeZone: string;
  rrule: string;
}): Promise<{ id: string }> {
  const response = await fetch(`${MOCK_GOOGLE_BASE_URL}/__test__/seed-recurring-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountId: options.accountId,
      calendarId: options.calendarId ?? "primary",
      summary: options.summary,
      start: { dateTime: options.startISO, timeZone: options.timeZone },
      end: { dateTime: options.endISO, timeZone: options.timeZone },
      recurrence: [options.rrule],
    }),
  });
  return response.json();
}

type MockEvent = { id: string; summary: string; start: { dateTime?: string; date?: string }; recurringEventId?: string };

/** Inspecciona el estado guardado en el mock (tarea 8.11): para verificar sin ambigüedad qué quedó persistido después de arrastrar o editar, en vez de inferirlo de la posición en píxeles de la grilla. */
export async function readMockEvents(accountId: string, calendarId = "primary"): Promise<MockEvent[]> {
  const response = await fetch(
    `${MOCK_GOOGLE_BASE_URL}/__test__/events?${new URLSearchParams({ accountId, calendarId })}`,
  );
  const body = (await response.json()) as { items: MockEvent[] };
  return body.items;
}
