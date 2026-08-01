import { GoogleAccessTokenExpiredError, GoogleTransientError, withGoogleApiBaseOverride } from "./google-client";

/**
 * ABM de calendarios de Google (tarea 4.1, capacidad
 * `administracion-de-calendarios`): crear, renombrar, recolorear y eliminar.
 * Mismo patrón que `lib/calendar/google-client.ts` —`fetch` sin `googleapis`
 * (decisión D-B)— pero en un archivo aparte: este bloque no puede editar
 * `google-client.ts` porque hay otro agente trabajando en paralelo sobre
 * eventos que también lo usa. Reexporta sus dos errores tipados en vez de
 * duplicarlos; el resto de este módulo es autónomo.
 *
 * El color de un calendario de Google (requirement "Recolorear un
 * calendario con los colores que admite Google") NO sale de
 * `lib/validation/colors.ts`: esa paleta de diez colores con nombre es de
 * Trazio, para `projects.color` y `labels.color` (D19). Un calendario de
 * Google es un objeto ajeno cuya paleta de colores la fija Google en el
 * endpoint `/colors` (`listCalendarColorOptions`); forzar la paleta de
 * Trazio sobre un dato que no le pertenece sería justamente lo que el
 * requirement pide evitar.
 *
 * Nota de API: el color de un calendario no vive en el recurso `Calendar`
 * (`/calendars/{id}`), vive en la entrada de `calendarList` del usuario
 * (`/users/me/calendarList/{id}`) — por eso `recolorCalendar` apunta a un
 * endpoint distinto del de crear/renombrar/eliminar. Verificado contra la
 * documentación oficial de la API (no hay credenciales todavía para
 * probarlo contra Google real, ver tarea 4.5).
 */

const CALENDARS_ENDPOINT = withGoogleApiBaseOverride("https://www.googleapis.com/calendar/v3/calendars");
const CALENDAR_LIST_ENTRY_ENDPOINT = withGoogleApiBaseOverride("https://www.googleapis.com/calendar/v3/users/me/calendarList");
const COLORS_ENDPOINT = withGoogleApiBaseOverride("https://www.googleapis.com/calendar/v3/colors");

const RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Mismo criterio que `google-client.ts`: un único reintento ante 429, nunca un bucle. */
async function fetchWithRetry(input: string, init: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 429) return response;
  await sleep(RETRY_DELAY_MS);
  return fetch(input, init);
}

/**
 * La conexión tiene un access token válido pero le falta el scope
 * `https://www.googleapis.com/auth/calendar` completo (requirement "Sin el
 * permiso necesario para administrar calendarios"). `google-client.ts` ya
 * pide siempre ese scope en `buildAuthorizationUrl`, así que esto solo
 * puede pasar con una conexión vieja autorizada antes de este cambio.
 */
export class GoogleInsufficientPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleInsufficientPermissionError";
  }
}

/**
 * Un 403 de Google al eliminar un calendario del que la cuenta conectada no
 * es dueña (importado, suscripto, compartido de solo lectura, feriados,
 * cumpleaños). `calendars.delete` exige rol `owner`; ningún scope lo
 * arregla, así que este error NO sugiere reconectar (a diferencia de
 * `GoogleInsufficientPermissionError`).
 */
export class GoogleForbiddenNonOwnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleForbiddenNonOwnerError";
  }
}

/** Un 403 de Google al intentar eliminar el calendario principal de la cuenta. */
export class GoogleCannotDeletePrimaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleCannotDeletePrimaryError";
  }
}

/** El `reason` que manda Google en el cuerpo de un error, para distinguir por qué rechazó un 403. */
async function googleErrorReason(response: Response): Promise<string | null> {
  const body = (await response
    .clone()
    .json()
    .catch(() => null)) as { error?: { errors?: Array<{ reason?: string }> } } | null;
  return body?.error?.errors?.[0]?.reason ?? null;
}

async function ensureOk(response: Response, context: string): Promise<void> {
  if (response.ok) return;
  if (response.status === 401) {
    throw new GoogleAccessTokenExpiredError("El access token venció o fue rechazado por Google");
  }
  if (response.status === 403) {
    const reason = await googleErrorReason(response);
    if (reason === "cannotDeletePrimaryCalendar") {
      throw new GoogleCannotDeletePrimaryError(`Google rechazó la solicitud al ${context} porque es el calendario principal`);
    }
    if (reason === "forbiddenForNonOrganizer") {
      throw new GoogleForbiddenNonOwnerError(
        `Google rechazó la solicitud al ${context}: la cuenta conectada no es dueña de este calendario`,
      );
    }
    throw new GoogleInsufficientPermissionError(
      `Google rechazó la solicitud al ${context} por falta de permiso: la conexión necesita reautorizarse con el permiso completo de calendario`,
    );
  }
  if (response.status === 429) {
    throw new GoogleTransientError(`Google sigue devolviendo 429 al ${context} después de reintentar`, 429);
  }
  if (response.status >= 500) {
    throw new GoogleTransientError(`Google devolvió ${response.status} al ${context}`, response.status);
  }
  throw new Error(`Google rechazó la solicitud al ${context}: ${response.status}`);
}

export type GoogleCalendarCreated = { id: string; summary: string };

/** Crea un calendario nuevo en la cuenta conectada (tarea 4.1). */
export async function createCalendar(accessToken: string, summary: string): Promise<GoogleCalendarCreated> {
  const response = await fetchWithRetry(CALENDARS_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ summary }),
  });
  await ensureOk(response, "crear el calendario");
  const body = (await response.json()) as { id: string; summary: string };
  return { id: body.id, summary: body.summary };
}

/** Cambia el nombre de un calendario existente (tarea 4.1). */
export async function renameCalendar(accessToken: string, calendarId: string, summary: string): Promise<void> {
  const response = await fetchWithRetry(`${CALENDARS_ENDPOINT}/${encodeURIComponent(calendarId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ summary }),
  });
  await ensureOk(response, "renombrar el calendario");
}

/**
 * Elimina un calendario de la cuenta de Google entera (tarea 4.1/4.4): esto
 * es `calendars.delete`, que borra el calendario y todos sus eventos de la
 * cuenta completa, no una operación que lo saque solo de la vista de
 * Trazio. La confirmación explícita que exige el requirement vive en
 * `components/settings/calendars-section.tsx`; nunca se llega hasta acá sin
 * haberla mostrado.
 *
 * Un 404 se trata como éxito: si el calendario ya no existe, el resultado
 * que quería quien pidió el borrado —que no esté— ya se cumple.
 */
export async function deleteCalendar(accessToken: string, calendarId: string): Promise<void> {
  const response = await fetchWithRetry(`${CALENDARS_ENDPOINT}/${encodeURIComponent(calendarId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404) return;
  await ensureOk(response, "eliminar el calendario");
}

export type GoogleCalendarColorOption = { id: string; background: string; foreground: string };

/**
 * Colores de calendario que admite Google (tarea 4.3): la sección
 * `calendar` de la respuesta de `/colors` (la sección `event` es para
 * colorear eventos individuales, no calendarios, y no aplica acá).
 */
export async function listCalendarColorOptions(accessToken: string): Promise<GoogleCalendarColorOption[]> {
  const response = await fetchWithRetry(COLORS_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await ensureOk(response, "listar los colores de calendario");
  const body = (await response.json()) as {
    calendar?: Record<string, { background: string; foreground: string }>;
  };
  return Object.entries(body.calendar ?? {}).map(([id, value]) => ({
    id,
    background: value.background,
    foreground: value.foreground,
  }));
}

/**
 * Recolorea un calendario (tarea 4.1/4.3) con uno de los `colorId` de
 * `listCalendarColorOptions`. El color vive en la entrada de
 * `calendarList` del usuario, no en el recurso `Calendar` (ver la nota de
 * API al principio del archivo).
 */
export async function recolorCalendar(accessToken: string, calendarId: string, colorId: string): Promise<void> {
  const response = await fetchWithRetry(`${CALENDAR_LIST_ENTRY_ENDPOINT}/${encodeURIComponent(calendarId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ colorId }),
  });
  await ensureOk(response, "recolorear el calendario");
}
