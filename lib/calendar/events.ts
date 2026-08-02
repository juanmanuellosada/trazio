import { z } from "zod";
import { resolveAccessToken } from "./events-access";
import { getCached, invalidateCalendar, setCached } from "./events-cache";
import {
  getEvent as getGoogleEvent,
  insertEvent,
  listEventInstances,
  patchEvent,
  deleteEvent as deleteGoogleEvent,
  type GoogleEventBody,
  type GoogleEventResource,
} from "./events-google";
import { GoogleAccessTokenExpiredError, GoogleReauthRequiredError, GoogleTransientError, listCalendars } from "./google-client";
import { continueRecurrenceFrom, countOccurrencesBefore, truncateRecurrenceBefore, type RecurrenceEditScope } from "./recurrence-scope";
import { fromGoogleRecurrenceLines, toGoogleRecurrenceLines, type EventRecurrenceValue } from "./event-recurrence";

export type { RecurrenceEditScope } from "./recurrence-scope";

/**
 * API de eventos de Google Calendar del lado de Trazio (tareas 3.1 a 3.5):
 * leer por rango con caché corta, y crear/editar/mover/eliminar, incluidas
 * las tres formas de tocar una serie recurrente. Orquesta
 * `lib/calendar/events-google.ts` (habla con Google) y
 * `lib/calendar/events-access.ts` (token + calendarios habilitados del
 * usuario), igual que `lib/calendar/connection.ts` orquesta
 * `google-client.ts` para OAuth.
 *
 * Los eventos **nunca** se guardan en Postgres (tarea 3.3, D-C): no hay una
 * tabla ni una columna en `supabase/migrations/` para esto en todo el
 * repo, y este módulo no llama a `createClient()` de Supabase para nada que
 * no sea leer la conexión (eso lo hace `events-access.ts`). Lo único que se
 * persiste acá es la caché en memoria de `events-cache.ts`.
 */

const CALENDAR_COLORS_TTL_MS = 5 * 60_000;

export type CalendarEventInstance = {
  /** El `id` de Google: para una instancia de una serie recurrente, es el id propio de esa ocurrencia, no el de la serie. */
  id: string;
  calendarId: string;
  calendarColor: string | null;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  /** `AAAA-MM-DD` si `allDay`, instante ISO si no. */
  start: string;
  end: string;
  /** `null` cuando `allDay`: un evento de todo el día no tiene zona horaria propia. */
  timeZone: string | null;
  isRecurring: boolean;
  /** El id de la serie, presente solo en instancias de un evento recurrente. */
  recurringEventId: string | null;
  /** Cuándo "debería" empezar esta ocurrencia según la regla, aunque se haya movido. Necesario para partir la serie (tarea 3.5). */
  originalStartTime: string | null;
};

export type EventsRange = { startISO: string; endISO: string };

export type EventsResult =
  | { status: "not_connected" }
  | { status: "unavailable"; reason: "transient" | "needs_reauth" }
  | { status: "ok"; events: CalendarEventInstance[] };

export type EventInput = {
  calendarId: string;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  start: string;
  end: string;
  /** Ignorado cuando `allDay`. */
  timeZone: string;
  /**
   * `undefined`: no tocar la repetición del evento (deja `recurrence`
   * afuera del PATCH, así que Google conserva la que ya tenía, con
   * cualquier `EXDATE` de excepciones sueltas). `null`: el evento no se
   * repite, o se le saca la repetición que tenía. Un valor: se repite según
   * esa regla (`alta-de-evento-completa`, D-C).
   */
  recurrence?: EventRecurrenceValue;
};

const eventRecurrenceInputSchema = z
  .object({
    rule: z.string().min(1),
    endsAt: z.string().nullable(),
    count: z.number().int().positive().nullable(),
  })
  .nullable();

export const eventInputSchema = z.object({
  calendarId: z.string().min(1),
  title: z.string().trim().min(1).max(1024),
  description: z.string().max(8192).nullable(),
  location: z.string().max(1024).nullable(),
  allDay: z.boolean(),
  start: z.string().min(1),
  end: z.string().min(1),
  timeZone: z.string().min(1),
  recurrence: eventRecurrenceInputSchema.optional(),
}) satisfies z.ZodType<EventInput>;

export type OccurrenceTarget = {
  calendarId: string;
  eventId: string;
  /** `null` cuando el evento no pertenece a ninguna serie. */
  recurringEventId: string | null;
  /** Requerido cuando `recurringEventId` no es `null` (tarea 3.5). */
  originalStartTime: string | null;
};

export const recurrenceEditScopeSchema = z.enum(["this", "this-and-following", "all"]) satisfies z.ZodType<RecurrenceEditScope>;

/**
 * Se pide un cambio sobre una ocurrencia de una serie sin decir a cuáles
 * ocurrencias aplica (tarea 3.6, requirement "sin default silencioso"):
 * ni `lib/calendar/events.ts` ni `components/calendar/recurrence-scope-dialog.tsx`
 * dejan pasar un cambio así.
 */
export class RecurrenceScopeRequiredError extends Error {
  constructor() {
    super("Este evento es parte de una serie recurrente: hay que elegir a cuáles ocurrencias aplica el cambio.");
    this.name = "RecurrenceScopeRequiredError";
  }
}

function eventsCacheKey(userId: string, calendarId: string, range: EventsRange): string {
  return `${userId}:${calendarId}:${range.startISO}:${range.endISO}`;
}

function connectionFailure(kind: "not_connected" | "needs_reauth"): { status: "not_connected" } | { status: "unavailable"; reason: "needs_reauth" } {
  return kind === "not_connected" ? { status: "not_connected" } : { status: "unavailable", reason: "needs_reauth" };
}

/** Traduce una falla de Google a un resultado degradado en vez de dejar el error sin capturar (tarea 3.7): nunca pantalla en blanco ni spinner infinito. */
function unavailableFrom(error: unknown): { status: "unavailable"; reason: "transient" | "needs_reauth" } {
  if (error instanceof GoogleReauthRequiredError) return { status: "unavailable", reason: "needs_reauth" };
  if (error instanceof GoogleTransientError || error instanceof GoogleAccessTokenExpiredError) {
    return { status: "unavailable", reason: "transient" };
  }
  throw error;
}

function normalizeInstance(resource: GoogleEventResource, calendarId: string, calendarColor: string | null): CalendarEventInstance {
  const allDay = Boolean(resource.start.date) && !resource.start.dateTime;
  const originalStart = resource.originalStartTime;
  return {
    id: resource.id,
    calendarId,
    calendarColor,
    title: resource.summary,
    description: resource.description ?? null,
    location: resource.location ?? null,
    allDay,
    start: allDay ? resource.start.date! : resource.start.dateTime!,
    end: allDay ? resource.end.date! : resource.end.dateTime!,
    timeZone: allDay ? null : (resource.start.timeZone ?? null),
    isRecurring: Boolean(resource.recurringEventId),
    recurringEventId: resource.recurringEventId ?? null,
    originalStartTime: originalStart ? (originalStart.dateTime ?? originalStart.date ?? null) : null,
  };
}

function googleBody(input: EventInput): GoogleEventBody {
  return {
    summary: input.title,
    description: input.description,
    location: input.location,
    start: input.allDay ? { date: input.start } : { dateTime: input.start, timeZone: input.timeZone },
    end: input.allDay ? { date: input.end } : { dateTime: input.end, timeZone: input.timeZone },
    ...(input.recurrence !== undefined ? { recurrence: toGoogleRecurrenceLines(input.recurrence, input.allDay) } : {}),
  };
}

/**
 * Colores de los calendarios habilitados, para pintar cada evento con el
 * color de su calendario de origen (requirement "Campos que se muestran de
 * un evento"). Reusa `listCalendars` de `google-client.ts` (ya expuesta por
 * la tarea 2.7) con el mismo access token que ya se resolvió para pedir
 * eventos, así que no hace falta un segundo refresh. Se cachea 5 minutos
 * (más que los eventos: el color de un calendario casi no cambia) y, si la
 * llamada falla, se degrada a "sin color" en vez de tirar abajo la lectura
 * de eventos entera — el color es una mejora visual, no algo de lo que
 * dependa que la vista funcione.
 */
async function getCalendarColors(userId: string, accessToken: string): Promise<Map<string, string | null>> {
  const cacheKey = `colors:${userId}`;
  const cached = getCached<Record<string, string | null>>(cacheKey);
  if (cached) return new Map(Object.entries(cached));

  try {
    const calendars = await listCalendars(accessToken);
    const map: Record<string, string | null> = {};
    for (const calendar of calendars) map[calendar.id] = calendar.backgroundColor;
    setCached(cacheKey, map, CALENDAR_COLORS_TTL_MS);
    return new Map(Object.entries(map));
  } catch {
    return new Map();
  }
}

async function getCalendarEvents(
  userId: string,
  calendarId: string,
  range: EventsRange,
  accessToken: string,
  color: string | null,
): Promise<CalendarEventInstance[]> {
  const key = eventsCacheKey(userId, calendarId, range);
  const cached = getCached<CalendarEventInstance[]>(key);
  if (cached) return cached;

  const raw = await listEventInstances(accessToken, calendarId, range.startISO, range.endISO);
  const normalized = raw.filter((resource) => resource.status !== "cancelled").map((resource) => normalizeInstance(resource, calendarId, color));
  setCached(key, normalized);
  return normalized;
}

/**
 * Lee los eventos de los calendarios habilitados en un rango (tarea 3.1),
 * cacheados 60 segundos (tarea 3.2, D-C). Nunca lanza por una falla
 * esperada de Google (tarea 3.7): devuelve un resultado que distingue "no
 * hay conexión" de "la conexión está rota" de "Google no respondió ahora",
 * para que quien construya la pantalla (grupo 5/7) siga mostrando tareas y
 * hábitos y avise puntualmente en vez de romper toda la vista.
 *
 * Si falla la lectura de un solo calendario habilitado, se trata el pedido
 * entero como no disponible: un resultado parcial sin decir cuál calendario
 * faltó sería más confuso que útil, y ninguna pantalla de esta fase (que
 * llega recién en el grupo 5) está preparada para mostrar eso.
 */
export async function getEventsForRange(userId: string, range: EventsRange): Promise<EventsResult> {
  const state = await resolveAccessToken(userId);
  if (state.kind === "not_connected") return { status: "not_connected" };
  if (state.kind === "needs_reauth") return { status: "unavailable", reason: "needs_reauth" };

  const { accessToken, enabledCalendarIds } = state;
  if (enabledCalendarIds.length === 0) return { status: "ok", events: [] };

  try {
    const colors = await getCalendarColors(userId, accessToken);
    const perCalendar = await Promise.all(
      enabledCalendarIds.map((calendarId) => getCalendarEvents(userId, calendarId, range, accessToken, colors.get(calendarId) ?? null)),
    );
    const events = perCalendar.flat().sort((a, b) => a.start.localeCompare(b.start));
    return { status: "ok", events };
  } catch (error) {
    return unavailableFrom(error);
  }
}

export type WriteResult =
  | { status: "not_connected" }
  | { status: "unavailable"; reason: "transient" | "needs_reauth" }
  | { status: "ok"; event: CalendarEventInstance };

/** Crea un evento nuevo (tarea 3.4). Se refleja en Google antes de devolver nada: no hay estado propio en Trazio que actualizar. */
export async function createEvent(userId: string, input: EventInput): Promise<WriteResult> {
  const state = await resolveAccessToken(userId);
  if (state.kind !== "ready") return connectionFailure(state.kind);

  try {
    const created = await insertEvent(state.accessToken, input.calendarId, googleBody(input));
    invalidateCalendar(userId, input.calendarId);
    return { status: "ok", event: normalizeInstance(created, input.calendarId, null) };
  } catch (error) {
    return unavailableFrom(error);
  }
}

export type EventRecurrenceResult =
  | { status: "not_connected" }
  | { status: "unavailable"; reason: "transient" | "needs_reauth" }
  | { status: "ok"; recurrence: EventRecurrenceValue };

/**
 * La repetición vigente del evento maestro de una serie (tarea 3.1/3.4):
 * para prefiltrar el editor de repetición al abrir la edición de un evento
 * que ya es parte de una serie, sin la cual no habría forma de saber si lo
 * que trae el formulario coincide con lo que ya existe en Google (y por lo
 * tanto si la regla cambió, la pregunta de la que depende el cruce con el
 * alcance de series). `eventId` tiene que ser el id del maestro
 * (`recurringEventId` de la instancia), no el de una ocurrencia: pedirle
 * esto a la instancia devuelve la instancia, que no trae `recurrence`.
 */
export async function getEventRecurrenceRule(userId: string, calendarId: string, eventId: string): Promise<EventRecurrenceResult> {
  const state = await resolveAccessToken(userId);
  if (state.kind !== "ready") return connectionFailure(state.kind);

  try {
    const master = await getGoogleEvent(state.accessToken, calendarId, eventId);
    return { status: "ok", recurrence: fromGoogleRecurrenceLines(master.recurrence) };
  } catch (error) {
    return unavailableFrom(error);
  }
}

function masterDtstart(master: GoogleEventResource): Date {
  return new Date(master.start.dateTime ?? master.start.date!);
}

/**
 * Edita un evento (tarea 3.4), o una ocurrencia de una serie recurrente
 * según `scope` (tarea 3.5). `scope` es obligatorio en cuanto
 * `target.recurringEventId` no es `null` — no hay default silencioso
 * (tarea 3.6): quien llama sin haber preguntado se encuentra con
 * `RecurrenceScopeRequiredError` en vez de un cambio aplicado a ciegas.
 */
export async function updateEvent(
  userId: string,
  target: OccurrenceTarget,
  changes: EventInput,
  scope?: RecurrenceEditScope,
): Promise<WriteResult> {
  if (target.recurringEventId && !scope) throw new RecurrenceScopeRequiredError();

  const state = await resolveAccessToken(userId);
  if (state.kind !== "ready") return connectionFailure(state.kind);
  const { accessToken } = state;
  const masterId = target.recurringEventId;

  try {
    let updated: GoogleEventResource;

    if (!masterId || scope === "all") {
      updated = await patchEvent(accessToken, target.calendarId, masterId ?? target.eventId, googleBody(changes));
    } else if (scope === "this") {
      updated = await patchEvent(accessToken, target.calendarId, target.eventId, googleBody(changes));
    } else {
      if (!target.originalStartTime) {
        throw new Error("Falta originalStartTime: no se puede partir una serie sin saber dónde.");
      }
      const master = await getGoogleEvent(accessToken, target.calendarId, masterId);
      const dtstart = masterDtstart(master);
      const splitAt = new Date(target.originalStartTime);
      const recurrence = master.recurrence ?? [];
      const precedingCount = countOccurrencesBefore(recurrence, dtstart, splitAt);

      if (precedingCount === 0) {
        // Partir desde la primera ocurrencia es lo mismo que "todas": no hay una mitad "pasada" que conservar.
        updated = await patchEvent(accessToken, target.calendarId, masterId, googleBody(changes));
      } else {
        const truncated = truncateRecurrenceBefore(recurrence, dtstart, splitAt, changes.allDay);
        await patchEvent(accessToken, target.calendarId, masterId, { recurrence: truncated });
        try {
          updated = await insertEvent(accessToken, target.calendarId, {
            ...googleBody(changes),
            recurrence: continueRecurrenceFrom(recurrence, dtstart, splitAt, changes.allDay),
          });
        } catch (insertError) {
          // No se pudo crear la mitad futura: restaurar la regla original para no dejar la serie cortada a mitad de camino.
          await patchEvent(accessToken, target.calendarId, masterId, { recurrence }).catch(() => {});
          throw insertError;
        }
      }
    }

    invalidateCalendar(userId, target.calendarId);
    return { status: "ok", event: normalizeInstance(updated, target.calendarId, null) };
  } catch (error) {
    return unavailableFrom(error);
  }
}

export type DeleteResult =
  | { status: "not_connected" }
  | { status: "unavailable"; reason: "transient" | "needs_reauth" }
  | { status: "ok" };

/** Elimina un evento (tarea 3.4), o una ocurrencia de una serie según `scope` (tarea 3.5). Misma obligación de `scope` explícito que `updateEvent`. */
export async function deleteEvent(userId: string, target: OccurrenceTarget, scope?: RecurrenceEditScope): Promise<DeleteResult> {
  if (target.recurringEventId && !scope) throw new RecurrenceScopeRequiredError();

  const state = await resolveAccessToken(userId);
  if (state.kind !== "ready") return connectionFailure(state.kind);
  const { accessToken } = state;
  const masterId = target.recurringEventId;

  try {
    if (!masterId || scope === "all") {
      await deleteGoogleEvent(accessToken, target.calendarId, masterId ?? target.eventId);
    } else if (scope === "this") {
      await deleteGoogleEvent(accessToken, target.calendarId, target.eventId);
    } else {
      if (!target.originalStartTime) {
        throw new Error("Falta originalStartTime: no se puede partir una serie sin saber dónde.");
      }
      const master = await getGoogleEvent(accessToken, target.calendarId, masterId);
      const dtstart = masterDtstart(master);
      const splitAt = new Date(target.originalStartTime);
      const recurrence = master.recurrence ?? [];
      const precedingCount = countOccurrencesBefore(recurrence, dtstart, splitAt);
      const isAllDay = Boolean(master.start.date) && !master.start.dateTime;

      if (precedingCount === 0) {
        // Borrar desde la primera ocurrencia en adelante es borrar la serie entera.
        await deleteGoogleEvent(accessToken, target.calendarId, masterId);
      } else {
        // Truncar la regla ya elimina esta ocurrencia y todas las que siguen: no hace falta una segunda llamada.
        await patchEvent(accessToken, target.calendarId, masterId, {
          recurrence: truncateRecurrenceBefore(recurrence, dtstart, splitAt, isAllDay),
        });
      }
    }

    invalidateCalendar(userId, target.calendarId);
    return { status: "ok" };
  } catch (error) {
    return unavailableFrom(error);
  }
}
