import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
// `rrule` es CommonJS: el loader nativo de ESM de Node no puede analizar
// estáticamente sus named exports, así que el valor se saca del default
// import (mismo paquete que ya usa `lib/calendar/recurrence-scope.ts`, ahí
// sí vía el bundler de Next, que no tiene este problema) — pero el tipo
// `RRule` sí se puede importar normalmente, `import type` no ejecuta nada.
import type { RRule } from "rrule";
import rrulePkg from "rrule";

const RRuleCtor = (rrulePkg as unknown as { RRule: typeof RRule }).RRule;

// Se ejecuta con `node` directo (`playwright.config.ts`), cuyo resolutor de
// ESM exige extensión en los imports relativos — a diferencia del resto del
// proyecto, que pasa por el bundler de Next/Playwright. Para no forzar
// `allowImportingTsExtensions` en todo `tsconfig.json` por un solo archivo,
// estas dos constantes se repiten acá en vez de importarse de
// `google-calendar-mock-config.ts` (que sí las exporta, para quien no tenga
// esta restricción): mantenerlas iguales si alguna cambia.
const MOCK_GOOGLE_PORT = 5601;
const MOCK_GOOGLE_BASE_URL = `http://127.0.0.1:${MOCK_GOOGLE_PORT}`;
const E2E_APP_ORIGIN = process.env.E2E_APP_ORIGIN ?? "http://127.0.0.1:3000";

/**
 * Servidor simulado de la API de Google (tarea 8.11): implementa lo mínimo
 * que `lib/calendar/google-client.ts`, `lib/calendar/events-google.ts` y el
 * flujo de OAuth necesitan para que los e2e ejerciten `app/api/calendar/*`
 * de punta a punta sin tocar la cuenta real de Google. Nace del seam
 * `withGoogleApiBaseOverride` (`lib/calendar/google-client.ts`): con
 * `GOOGLE_API_BASE_URL` apuntando acá, cualquier llamada del servidor de
 * Next (auth, token, calendarList, eventos) termina en este proceso en vez
 * de en `googleapis.com`.
 *
 * No implementa el ABM de calendarios (`google-calendars-client.ts`:
 * crear/renombrar/recolorear/eliminar) ni `/colors`: ningún flujo de la
 * tarea 8.11 los necesita, y ya están verificados contra Google real
 * (tarea 4.5).
 *
 * Estado en memoria por "cuenta": una cuenta nace en el intercambio de
 * código (`POST /token`, `grant_type=authorization_code`) con un único
 * calendario ("Personal", primario). El `accountId` es literalmente el
 * `code`/`state` del intento de conexión (el mock no valida un `client_id`
 * real, así que reusar `state` como `code` alcanza) — lo que le permite al
 * test capturar ese valor mirando la navegación a `/o/oauth2/v2/auth` y
 * usarlo después para sembrar una serie recurrente vía `/__test__/*` sin
 * que el servidor le exponga nunca el access token real.
 */

type GoogleEventDateTime = { date?: string; dateTime?: string; timeZone?: string };

type StoredEvent = {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  recurrence?: string[];
  status?: string;
  /** Solo presentes en una instancia expandida de una serie (`expandMaster`), nunca en el maestro guardado. */
  recurringEventId?: string;
  originalStartTime?: GoogleEventDateTime;
};

type ExceptionOverride = { cancelled: true } | Omit<StoredEvent, "id" | "recurrence" | "status">;

type CalendarState = {
  summary: string;
  primary: boolean;
  backgroundColor: string;
  /** Todo calendario en este simulador es propio de la cuenta simulada (no hay noción de compartido/importado): siempre "owner" — mismo campo que `lib/calendar/google-client.ts` lee de la respuesta real. */
  accessRole: string;
  events: Map<string, StoredEvent>;
  exceptionsByMaster: Map<string, Map<string, ExceptionOverride>>;
  nextEventSeq: number;
};

type AccountState = { calendars: Map<string, CalendarState> };

const accounts = new Map<string, AccountState>();

const INSTANCE_SEPARATOR = "::occ::";

function getOrCreateAccount(accountId: string): AccountState {
  let account = accounts.get(accountId);
  if (!account) {
    const calendars = new Map<string, CalendarState>();
    calendars.set("primary", {
      summary: "Personal",
      primary: true,
      backgroundColor: "#4285f4",
      accessRole: "owner",
      events: new Map(),
      exceptionsByMaster: new Map(),
      nextEventSeq: 1,
    });
    account = { calendars };
    accounts.set(accountId, account);
  }
  return account;
}

function getOrCreateCalendar(account: AccountState, calendarId: string): CalendarState {
  let calendar = account.calendars.get(calendarId);
  if (!calendar) {
    calendar = {
      summary: calendarId,
      primary: false,
      backgroundColor: "#33b679",
      accessRole: "owner",
      events: new Map(),
      exceptionsByMaster: new Map(),
      nextEventSeq: 1,
    };
    account.calendars.set(calendarId, calendar);
  }
  return calendar;
}

function accountIdFromBearer(authorization: string | undefined): string | null {
  const match = /^Bearer access-(.+)$/.exec(authorization ?? "");
  return match ? match[1]! : null;
}

function toDate(value: GoogleEventDateTime): Date {
  return new Date(value.dateTime ?? value.date ?? "");
}

function rruleFromMaster(master: StoredEvent): RRule | null {
  const line = (master.recurrence ?? []).find((l) => l.toUpperCase().startsWith("RRULE:"));
  if (!line) return null;
  return new RRuleCtor({ ...RRuleCtor.parseString(line), dtstart: toDate(master.start) });
}

/** Instancias expandidas de una serie recurrente dentro de `[timeMin, timeMax]`, con las excepciones ya guardadas superpuestas (tarea 8.11, matiz "todas las ocurrencias" descubierto al verificar contra Google real). */
function expandMaster(master: StoredEvent, exceptions: Map<string, ExceptionOverride> | undefined, timeMin: Date, timeMax: Date): StoredEvent[] {
  const rule = rruleFromMaster(master);
  if (!rule) return [];
  const durationMs = toDate(master.end).getTime() - toDate(master.start).getTime();
  const occurrences = rule.between(timeMin, timeMax, true);

  return occurrences.flatMap((occurrence): StoredEvent[] => {
    const originalStartIso = occurrence.toISOString();
    const override = exceptions?.get(originalStartIso);
    if (override && "cancelled" in override) return [];

    const shiftedStart = occurrence;
    const shiftedEnd = new Date(occurrence.getTime() + durationMs);
    const base: StoredEvent = {
      id: `${master.id}${INSTANCE_SEPARATOR}${originalStartIso}`,
      summary: master.summary,
      description: master.description,
      location: master.location,
      start: { dateTime: shiftedStart.toISOString(), timeZone: master.start.timeZone },
      end: { dateTime: shiftedEnd.toISOString(), timeZone: master.end.timeZone },
    };
    const withOverride = override ? { ...base, ...override, id: base.id } : base;
    return [{ ...withOverride, recurringEventId: master.id, originalStartTime: { dateTime: originalStartIso } }];
  });
}

function listInstances(calendar: CalendarState, timeMin: Date, timeMax: Date): StoredEvent[] {
  const result: StoredEvent[] = [];
  for (const event of calendar.events.values()) {
    if (event.status === "cancelled") continue;
    // `recurrence: []` (no solo `undefined`) es lo que manda el cliente para
    // "no se repite" desde que el alta de evento incluye el selector de
    // repetición (commit "el alta de evento deja de tener el horario
    // fijo"): un array vacío es un valor truthy, así que sin este chequeo de
    // longitud un evento sin repetición se trataba como maestro de una serie
    // sin ninguna regla, y `expandMaster` no devolvía ninguna instancia.
    if (event.recurrence && event.recurrence.length > 0) {
      result.push(...expandMaster(event, calendar.exceptionsByMaster.get(event.id), timeMin, timeMax));
    } else if (toDate(event.end) > timeMin && toDate(event.start) < timeMax) {
      result.push(event);
    }
  }
  return result.sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime());
}

function parseInstanceId(id: string): { masterId: string; originalStartIso: string } | null {
  const index = id.indexOf(INSTANCE_SEPARATOR);
  if (index === -1) return null;
  return { masterId: id.slice(0, index), originalStartIso: id.slice(index + INSTANCE_SEPARATOR.length) };
}

async function readBody(request: import("node:http").IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function json(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", MOCK_GOOGLE_BASE_URL);
  const { pathname, searchParams } = url;

  // Healthcheck para `playwright.config.ts` (`webServer.url`).
  if (req.method === "GET" && pathname === "/__test__/health") {
    return json(res, 200, { ok: true });
  }

  // --- OAuth ---
  if (req.method === "GET" && pathname === "/o/oauth2/v2/auth") {
    const state = searchParams.get("state") ?? "";
    const redirectUri = searchParams.get("redirect_uri") ?? "";
    const path = (() => {
      try {
        return new URL(redirectUri).pathname;
      } catch {
        return "/api/auth/google/callback";
      }
    })();
    // Origen fijo a `127.0.0.1:3000` (ver comentario en
    // `google-calendar-mock-config.ts`): ignora el host real de
    // `redirect_uri`, que en `.env.local` es `localhost` por motivos de
    // `pnpm dev`, no del e2e.
    const location = `${E2E_APP_ORIGIN}${path}?code=${encodeURIComponent(state)}&state=${encodeURIComponent(state)}`;
    res.writeHead(302, { Location: location });
    return res.end();
  }

  if (req.method === "POST" && pathname === "/token") {
    const body = new URLSearchParams(await readBody(req));
    const grantType = body.get("grant_type");
    if (grantType === "authorization_code") {
      const accountId = body.get("code") ?? randomUUID();
      getOrCreateAccount(accountId);
      return json(res, 200, { access_token: `access-${accountId}`, refresh_token: `refresh-${accountId}`, expires_in: 3600 });
    }
    if (grantType === "refresh_token") {
      const refreshToken = body.get("refresh_token") ?? "";
      const accountId = refreshToken.replace(/^refresh-/, "");
      getOrCreateAccount(accountId);
      return json(res, 200, { access_token: `access-${accountId}`, expires_in: 3600 });
    }
    return json(res, 400, { error: "invalid_grant" });
  }

  // --- Calendar list ---
  if (req.method === "GET" && pathname === "/calendar/v3/users/me/calendarList") {
    const accountId = accountIdFromBearer(req.headers.authorization);
    if (!accountId) return json(res, 401, { error: "invalid_token" });
    const account = getOrCreateAccount(accountId);
    const items = [...account.calendars.entries()].map(([id, calendar]) => ({
      id,
      summary: calendar.summary,
      backgroundColor: calendar.backgroundColor,
      primary: calendar.primary,
      accessRole: calendar.accessRole,
    }));
    return json(res, 200, { items });
  }

  // --- Events ---
  const eventsListOrCreate = /^\/calendar\/v3\/calendars\/([^/]+)\/events$/.exec(pathname);
  const eventItem = /^\/calendar\/v3\/calendars\/([^/]+)\/events\/([^/]+)$/.exec(pathname);

  if (eventsListOrCreate) {
    const accountId = accountIdFromBearer(req.headers.authorization);
    if (!accountId) return json(res, 401, { error: "invalid_token" });
    const calendarId = decodeURIComponent(eventsListOrCreate[1]!);
    const account = getOrCreateAccount(accountId);
    const calendar = getOrCreateCalendar(account, calendarId);

    if (req.method === "GET") {
      const timeMin = new Date(searchParams.get("timeMin") ?? "");
      const timeMax = new Date(searchParams.get("timeMax") ?? "");
      return json(res, 200, { items: listInstances(calendar, timeMin, timeMax) });
    }

    if (req.method === "POST") {
      const body = JSON.parse(await readBody(req)) as Partial<StoredEvent>;
      const id = `evt-${calendar.nextEventSeq++}`;
      const created: StoredEvent = {
        id,
        summary: body.summary ?? "",
        description: body.description ?? null,
        location: body.location ?? null,
        start: body.start!,
        end: body.end!,
        ...(body.recurrence ? { recurrence: body.recurrence } : {}),
      };
      calendar.events.set(id, created);
      return json(res, 200, created);
    }
  }

  if (eventItem) {
    const accountId = accountIdFromBearer(req.headers.authorization);
    if (!accountId) return json(res, 401, { error: "invalid_token" });
    const calendarId = decodeURIComponent(eventItem[1]!);
    const eventId = decodeURIComponent(eventItem[2]!);
    const account = getOrCreateAccount(accountId);
    const calendar = getOrCreateCalendar(account, calendarId);

    const instance = parseInstanceId(eventId);

    if (req.method === "GET") {
      const master = instance ? calendar.events.get(instance.masterId) : calendar.events.get(eventId);
      if (!master) return json(res, 404, { error: "not_found" });
      return json(res, 200, master);
    }

    if (req.method === "PATCH") {
      const patch = JSON.parse(await readBody(req)) as Partial<StoredEvent>;

      if (instance) {
        // Scope "this": una excepción puntual sobre la ocurrencia, sin tocar el maestro (`recurrence-scope.ts`).
        const master = calendar.events.get(instance.masterId);
        if (!master) return json(res, 404, { error: "not_found" });
        let exceptions = calendar.exceptionsByMaster.get(instance.masterId);
        if (!exceptions) {
          exceptions = new Map();
          calendar.exceptionsByMaster.set(instance.masterId, exceptions);
        }
        const override: ExceptionOverride = {
          summary: patch.summary ?? master.summary,
          description: patch.description ?? master.description,
          location: patch.location ?? master.location,
          start: patch.start ?? master.start,
          end: patch.end ?? master.end,
        };
        exceptions.set(instance.originalStartIso, override);
        return json(res, 200, {
          id: eventId,
          ...override,
          recurringEventId: instance.masterId,
          originalStartTime: { dateTime: instance.originalStartIso },
        });
      }

      const existing = calendar.events.get(eventId);
      if (!existing) return json(res, 404, { error: "not_found" });

      const isContentPatch = patch.summary !== undefined;
      const updated: StoredEvent = {
        ...existing,
        ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.location !== undefined ? { location: patch.location } : {}),
        ...(patch.start !== undefined ? { start: patch.start } : {}),
        ...(patch.end !== undefined ? { end: patch.end } : {}),
        ...(patch.recurrence !== undefined ? { recurrence: patch.recurrence } : {}),
      };
      calendar.events.set(eventId, updated);

      // Scope "all" (contenido, no solo `recurrence`): Google también
      // sobrescribe las ocurrencias ya modificadas individualmente en vez
      // de conservar sus excepciones — el matiz que la verificación contra
      // Google real descubrió (tarea 8.11).
      if (isContentPatch) calendar.exceptionsByMaster.delete(eventId);

      return json(res, 200, updated);
    }

    if (req.method === "DELETE") {
      calendar.events.delete(instance ? instance.masterId : eventId);
      res.writeHead(200);
      return res.end();
    }
  }

  // --- Solo para los e2e: sembrar una serie recurrente e inspeccionar estado ---
  if (req.method === "POST" && pathname === "/__test__/seed-recurring-event") {
    const body = JSON.parse(await readBody(req)) as {
      accountId: string;
      calendarId: string;
      summary: string;
      start: GoogleEventDateTime;
      end: GoogleEventDateTime;
      recurrence: string[];
    };
    const account = getOrCreateAccount(body.accountId);
    const calendar = getOrCreateCalendar(account, body.calendarId);
    const id = `evt-${calendar.nextEventSeq++}`;
    const master: StoredEvent = {
      id,
      summary: body.summary,
      description: null,
      location: null,
      start: body.start,
      end: body.end,
      recurrence: body.recurrence,
    };
    calendar.events.set(id, master);
    return json(res, 200, { id });
  }

  if (req.method === "GET" && pathname === "/__test__/events") {
    const accountId = searchParams.get("accountId") ?? "";
    const calendarId = searchParams.get("calendarId") ?? "primary";
    const account = getOrCreateAccount(accountId);
    const calendar = getOrCreateCalendar(account, calendarId);
    const timeMin = new Date("2000-01-01T00:00:00Z");
    const timeMax = new Date("2100-01-01T00:00:00Z");
    return json(res, 200, { items: listInstances(calendar, timeMin, timeMax) });
  }

  json(res, 404, { error: "not_found" });
});

server.listen(MOCK_GOOGLE_PORT, "127.0.0.1", () => {
  console.log(`Servidor simulado de Google Calendar escuchando en ${MOCK_GOOGLE_BASE_URL}`);
});
