import { GoogleAccessTokenExpiredError, GoogleTransientError, withGoogleApiBaseOverride } from "./google-client";

/**
 * Llamadas a la API de eventos de Google Calendar
 * (`/calendars/{calendarId}/events*`, tarea 3.1). Hermano de
 * `lib/calendar/google-client.ts` pero para el CRUD de eventos en vez de
 * OAuth/calendarios — mismo criterio D-B (`fetch`, sin `googleapis`) y los
 * mismos tipos de error (`GoogleAccessTokenExpiredError`,
 * `GoogleTransientError`, importados de `google-client.ts`), para que quien
 * orquesta (`lib/calendar/events.ts`) reaccione igual sin importar qué
 * endpoint falló.
 *
 * `google-client.ts` está bloqueado en esta tanda (otro agente trabaja ahí
 * en paralelo con la administración de calendarios) y no exporta
 * `fetchWithRetry`, así que el reintento único ante 429 se repite acá en
 * miniatura. Ver el informe final del agente.
 */

const CALENDAR_API_BASE = withGoogleApiBaseOverride("https://www.googleapis.com/calendar/v3/calendars");
const RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(input: string, init: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 429) return response;
  await sleep(RETRY_DELAY_MS);
  return fetch(input, init);
}

async function throwForErrorStatus(response: Response, context: string): Promise<never> {
  if (response.status === 401) {
    throw new GoogleAccessTokenExpiredError(`El access token venció o fue rechazado al ${context}`);
  }
  if (response.status === 429) {
    throw new GoogleTransientError(`Google sigue devolviendo 429 al ${context} después de reintentar`, 429);
  }
  if (response.status >= 500) {
    throw new GoogleTransientError(`Google devolvió ${response.status} al ${context}`, response.status);
  }
  const body = await response.text().catch(() => "");
  throw new Error(`Google rechazó la solicitud al ${context}: ${response.status} ${body}`);
}

export type GoogleEventDateTime = { date?: string; dateTime?: string; timeZone?: string };

export type GoogleEventBody = {
  summary: string;
  description: string | null;
  location: string | null;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  recurrence?: string[];
};

export type GoogleEventResource = GoogleEventBody & {
  id: string;
  status?: string;
  recurringEventId?: string;
  originalStartTime?: GoogleEventDateTime;
};

type GoogleEventListResponse = { items?: GoogleEventResource[] };

function eventsUrl(calendarId: string, eventId?: string): string {
  const base = `${CALENDAR_API_BASE}/${encodeURIComponent(calendarId)}/events`;
  return eventId ? `${base}/${encodeURIComponent(eventId)}` : base;
}

function authHeaders(accessToken: string, withJson = false): HeadersInit {
  return withJson
    ? { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
    : { Authorization: `Bearer ${accessToken}` };
}

/**
 * Instancias de eventos en un rango (tarea 3.1). `singleEvents=true` es lo
 * que hace que Google expanda cada serie recurrente en sus ocurrencias
 * individuales, cada una con su propio `id` y, si pertenece a una serie,
 * `recurringEventId` + `originalStartTime` — la base para las tres formas
 * de editar (tarea 3.5).
 */
export async function listEventInstances(
  accessToken: string,
  calendarId: string,
  timeMinISO: string,
  timeMaxISO: string,
): Promise<GoogleEventResource[]> {
  const params = new URLSearchParams({
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
  });
  const response = await fetchWithRetry(`${eventsUrl(calendarId)}?${params}`, { headers: authHeaders(accessToken) });
  if (!response.ok) await throwForErrorStatus(response, `leer los eventos del calendario ${calendarId}`);
  const body = (await response.json()) as GoogleEventListResponse;
  return body.items ?? [];
}

/**
 * El evento maestro de una serie recurrente (sin expandir): trae `recurrence`
 * (el RRULE) y el `start` que sirve de `DTSTART` para partir la serie
 * (tarea 3.5, "esta y las siguientes").
 */
export async function getEvent(accessToken: string, calendarId: string, eventId: string): Promise<GoogleEventResource> {
  const response = await fetchWithRetry(eventsUrl(calendarId, eventId), { headers: authHeaders(accessToken) });
  if (!response.ok) await throwForErrorStatus(response, `leer el evento ${eventId}`);
  return (await response.json()) as GoogleEventResource;
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  body: GoogleEventBody,
): Promise<GoogleEventResource> {
  const response = await fetchWithRetry(eventsUrl(calendarId), {
    method: "POST",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(body),
  });
  if (!response.ok) await throwForErrorStatus(response, "crear el evento");
  return (await response.json()) as GoogleEventResource;
}

export async function patchEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  patch: Partial<GoogleEventBody>,
): Promise<GoogleEventResource> {
  const response = await fetchWithRetry(eventsUrl(calendarId, eventId), {
    method: "PATCH",
    headers: authHeaders(accessToken, true),
    body: JSON.stringify(patch),
  });
  if (!response.ok) await throwForErrorStatus(response, `editar el evento ${eventId}`);
  return (await response.json()) as GoogleEventResource;
}

/** Idempotente: un 410 (ya eliminado) se trata como éxito, no como error. */
export async function deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const response = await fetchWithRetry(eventsUrl(calendarId, eventId), {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
  if (response.status === 410) return;
  if (!response.ok) await throwForErrorStatus(response, `eliminar el evento ${eventId}`);
}
