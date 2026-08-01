import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEventsCacheForTests, getCached } from "./events-cache";
import { GoogleAccessTokenExpiredError, GoogleReauthRequiredError, GoogleTransientError } from "./google-client";

vi.mock("./events-access", () => ({ resolveAccessToken: vi.fn() }));
vi.mock("./events-google", () => ({
  listEventInstances: vi.fn(),
  getEvent: vi.fn(),
  insertEvent: vi.fn(),
  patchEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));
vi.mock("./google-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./google-client")>();
  return { ...actual, listCalendars: vi.fn() };
});

import { resolveAccessToken } from "./events-access";
import { getEvent, insertEvent, listEventInstances, patchEvent, deleteEvent as deleteGoogleEvent } from "./events-google";
import { listCalendars } from "./google-client";
import {
  RecurrenceScopeRequiredError,
  createEvent,
  deleteEvent,
  getEventsForRange,
  updateEvent,
  type EventInput,
  type OccurrenceTarget,
} from "./events";

// Tarea 3.9: las tres formas de editar/eliminar una serie recurrente, la
// degradación cuando Google falla (429/500/token vencido, simulados acá
// como los errores tipados que ya arma `lib/calendar/events-google.ts`) y
// el caché de 60 segundos (D-C). Ver el informe final del agente: nada de
// esto se probó contra Google real.

const USER_ID = "user-1";
const CALENDAR_ID = "cal-1";

function readyState(overrides?: Partial<{ accessToken: string; enabledCalendarIds: string[] }>) {
  return { kind: "ready" as const, accessToken: "token-1", enabledCalendarIds: [CALENDAR_ID], ...overrides };
}

function googleEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "e1",
    summary: "Reunión",
    description: null,
    location: null,
    start: { dateTime: "2026-08-03T10:00:00-03:00", timeZone: "America/Argentina/Buenos_Aires" },
    end: { dateTime: "2026-08-03T11:00:00-03:00", timeZone: "America/Argentina/Buenos_Aires" },
    ...overrides,
  };
}

const INPUT: EventInput = {
  calendarId: CALENDAR_ID,
  title: "Reunión de equipo",
  description: null,
  location: null,
  allDay: false,
  start: "2026-08-03T10:00:00-03:00",
  end: "2026-08-03T11:00:00-03:00",
  timeZone: "America/Argentina/Buenos_Aires",
};

beforeEach(() => {
  clearEventsCacheForTests();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getEventsForRange — degradación (tarea 3.7)", () => {
  it("sin conexión, no llama a Google y avisa 'not_connected'", async () => {
    vi.mocked(resolveAccessToken).mockResolvedValueOnce({ kind: "not_connected" });

    const result = await getEventsForRange(USER_ID, { startISO: "a", endISO: "b" });

    expect(result).toEqual({ status: "not_connected" });
    expect(listEventInstances).not.toHaveBeenCalled();
  });

  it("con la conexión rota, avisa 'needs_reauth' sin llamar a Google", async () => {
    vi.mocked(resolveAccessToken).mockResolvedValueOnce({ kind: "needs_reauth" });

    const result = await getEventsForRange(USER_ID, { startISO: "a", endISO: "b" });

    expect(result).toEqual({ status: "unavailable", reason: "needs_reauth" });
    expect(listEventInstances).not.toHaveBeenCalled();
  });

  it("sin calendarios habilitados, devuelve una lista vacía sin llamar a Google", async () => {
    vi.mocked(resolveAccessToken).mockResolvedValueOnce(readyState({ enabledCalendarIds: [] }));

    const result = await getEventsForRange(USER_ID, { startISO: "a", endISO: "b" });

    expect(result).toEqual({ status: "ok", events: [] });
    expect(listEventInstances).not.toHaveBeenCalled();
  });

  it("si Google no responde (falla transitoria), muestra tareas y hábitos igual: acá se traduce a 'unavailable', nunca una excepción sin capturar", async () => {
    vi.mocked(resolveAccessToken).mockResolvedValueOnce(readyState());
    vi.mocked(listCalendars).mockResolvedValueOnce([]);
    vi.mocked(listEventInstances).mockRejectedValueOnce(new GoogleTransientError("500", 500));

    const result = await getEventsForRange(USER_ID, { startISO: "a", endISO: "b" });

    expect(result).toEqual({ status: "unavailable", reason: "transient" });
  });

  it("un token vencido en medio del pedido también degrada, no revienta la vista", async () => {
    vi.mocked(resolveAccessToken).mockResolvedValueOnce(readyState());
    vi.mocked(listCalendars).mockResolvedValueOnce([]);
    vi.mocked(listEventInstances).mockRejectedValueOnce(new GoogleAccessTokenExpiredError("401"));

    const result = await getEventsForRange(USER_ID, { startISO: "a", endISO: "b" });

    expect(result).toEqual({ status: "unavailable", reason: "transient" });
  });

  it("si falla el color del calendario, los eventos igual se muestran (el color es cosmético, no bloqueante)", async () => {
    vi.mocked(resolveAccessToken).mockResolvedValueOnce(readyState());
    vi.mocked(listCalendars).mockRejectedValueOnce(new GoogleTransientError("500", 500));
    vi.mocked(listEventInstances).mockResolvedValueOnce([googleEvent()]);

    const result = await getEventsForRange(USER_ID, { startISO: "a", endISO: "b" });

    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.events[0].calendarColor).toBeNull();
  });
});

describe("getEventsForRange — campos y normalización (requirement 'Campos que se muestran de un evento')", () => {
  beforeEach(() => {
    vi.mocked(resolveAccessToken).mockResolvedValue(readyState());
    vi.mocked(listCalendars).mockResolvedValue([
      { id: CALENDAR_ID, summary: "Trabajo", backgroundColor: "#4285f4", primary: true, accessRole: "owner" },
    ]);
  });

  it("un evento puntual muestra título, horario y ubicación, sin inventar una descripción", async () => {
    vi.mocked(listEventInstances).mockResolvedValueOnce([
      googleEvent({ id: "e1", summary: "Turno dentista", location: "Av. Corrientes 1234", description: null }),
    ]);

    const result = await getEventsForRange(USER_ID, { startISO: "a", endISO: "b" });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.events[0]).toMatchObject({
      title: "Turno dentista",
      location: "Av. Corrientes 1234",
      description: null,
      allDay: false,
    });
  });

  it("un evento de todo el día se distingue de uno con horario", async () => {
    vi.mocked(listEventInstances).mockResolvedValueOnce([
      googleEvent({ start: { date: "2026-08-10" }, end: { date: "2026-08-11" } }),
    ]);

    const result = await getEventsForRange(USER_ID, { startISO: "a", endISO: "b" });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.events[0].allDay).toBe(true);
    expect(result.events[0].start).toBe("2026-08-10");
    expect(result.events[0].timeZone).toBeNull();
  });

  it("el calendario de origen aparece con su color", async () => {
    vi.mocked(listEventInstances).mockResolvedValueOnce([googleEvent()]);

    const result = await getEventsForRange(USER_ID, { startISO: "a", endISO: "b" });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.events[0].calendarColor).toBe("#4285f4");
  });

  it("un evento recurrente se identifica como tal", async () => {
    vi.mocked(listEventInstances).mockResolvedValueOnce([
      googleEvent({ recurringEventId: "master-1", originalStartTime: { dateTime: "2026-08-03T10:00:00-03:00" } }),
    ]);

    const result = await getEventsForRange(USER_ID, { startISO: "a", endISO: "b" });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.events[0].isRecurring).toBe(true);
    expect(result.events[0].recurringEventId).toBe("master-1");
  });

  it("descarta las instancias canceladas: no las muestra como si siguieran vigentes", async () => {
    vi.mocked(listEventInstances).mockResolvedValueOnce([googleEvent({ id: "e-viva" }), googleEvent({ id: "e-borrada", status: "cancelled" })]);

    const result = await getEventsForRange(USER_ID, { startISO: "a", endISO: "b" });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.events.map((e) => e.id)).toEqual(["e-viva"]);
  });
});

describe("getEventsForRange — caché de 60 segundos (tarea 3.2, D-C)", () => {
  beforeEach(() => {
    vi.mocked(resolveAccessToken).mockResolvedValue(readyState());
    vi.mocked(listCalendars).mockResolvedValue([]);
  });

  it("una segunda consulta dentro de los 60 segundos no vuelve a llamar a Google", async () => {
    vi.mocked(listEventInstances).mockResolvedValue([googleEvent()]);
    const range = { startISO: "2026-08-01", endISO: "2026-08-31" };

    await getEventsForRange(USER_ID, range);
    await getEventsForRange(USER_ID, range);

    expect(listEventInstances).toHaveBeenCalledTimes(1);
  });

  it("pasados los 60 segundos, se vuelve a consultar a Google", async () => {
    vi.useFakeTimers();
    vi.mocked(listEventInstances).mockResolvedValue([googleEvent()]);
    const range = { startISO: "2026-08-01", endISO: "2026-08-31" };

    await getEventsForRange(USER_ID, range);
    vi.advanceTimersByTime(61_000);
    await getEventsForRange(USER_ID, range);

    expect(listEventInstances).toHaveBeenCalledTimes(2);
  });
});

describe("createEvent (tarea 3.4)", () => {
  it("crea el evento y borra el caché de ese calendario, para que la próxima lectura ya lo vea", async () => {
    vi.mocked(resolveAccessToken).mockResolvedValue(readyState());
    vi.mocked(listCalendars).mockResolvedValue([]);
    vi.mocked(listEventInstances).mockResolvedValue([]);
    vi.mocked(insertEvent).mockResolvedValueOnce(googleEvent({ id: "nuevo" }));

    const range = { startISO: "2026-08-01", endISO: "2026-08-31" };
    await getEventsForRange(USER_ID, range); // siembra el caché
    expect(getCached(`${USER_ID}:${CALENDAR_ID}:${range.startISO}:${range.endISO}`)).toBeDefined();

    const result = await createEvent(USER_ID, INPUT);

    expect(result.status).toBe("ok");
    expect(insertEvent).toHaveBeenCalledWith("token-1", CALENDAR_ID, expect.objectContaining({ summary: "Reunión de equipo" }));
    expect(getCached(`${USER_ID}:${CALENDAR_ID}:${range.startISO}:${range.endISO}`)).toBeUndefined();
  });

  it("sin conexión, no intenta crear nada en Google", async () => {
    vi.mocked(resolveAccessToken).mockResolvedValueOnce({ kind: "not_connected" });
    const result = await createEvent(USER_ID, INPUT);
    expect(result).toEqual({ status: "not_connected" });
    expect(insertEvent).not.toHaveBeenCalled();
  });
});

describe("updateEvent — las tres formas de editar una serie (tarea 3.5, D-D)", () => {
  const target: OccurrenceTarget = {
    calendarId: CALENDAR_ID,
    eventId: "instancia-3",
    recurringEventId: "master-1",
    originalStartTime: "2026-08-17T10:00:00-03:00", // tercera ocurrencia (semanas 0,1,2)
  };

  beforeEach(() => {
    vi.mocked(resolveAccessToken).mockResolvedValue(readyState());
  });

  it("sin `scope`, en un evento de una serie, tira RecurrenceScopeRequiredError: no hay default silencioso", async () => {
    await expect(updateEvent(USER_ID, target, INPUT)).rejects.toBeInstanceOf(RecurrenceScopeRequiredError);
    expect(patchEvent).not.toHaveBeenCalled();
  });

  it("'esta ocurrencia' hace un PATCH sobre la instancia, no sobre la serie", async () => {
    vi.mocked(patchEvent).mockResolvedValueOnce(googleEvent());

    await updateEvent(USER_ID, target, INPUT, "this");

    expect(patchEvent).toHaveBeenCalledWith("token-1", CALENDAR_ID, "instancia-3", expect.objectContaining({ summary: INPUT.title }));
    expect(insertEvent).not.toHaveBeenCalled();
    expect(getEvent).not.toHaveBeenCalled();
  });

  it("'todas' hace un PATCH sobre el evento maestro", async () => {
    vi.mocked(patchEvent).mockResolvedValueOnce(googleEvent());

    await updateEvent(USER_ID, target, INPUT, "all");

    expect(patchEvent).toHaveBeenCalledWith("token-1", CALENDAR_ID, "master-1", expect.objectContaining({ summary: INPUT.title }));
    expect(insertEvent).not.toHaveBeenCalled();
  });

  it("'esta y las siguientes' trunca la serie original y crea una nueva que continúa desde ahí", async () => {
    vi.mocked(getEvent).mockResolvedValueOnce(
      googleEvent({ id: "master-1", start: { dateTime: "2026-08-03T10:00:00-03:00" }, recurrence: ["RRULE:FREQ=WEEKLY;COUNT=10"] }),
    );
    vi.mocked(patchEvent).mockResolvedValueOnce(googleEvent());
    vi.mocked(insertEvent).mockResolvedValueOnce(googleEvent({ id: "nueva-serie" }));

    const result = await updateEvent(USER_ID, target, INPUT, "this-and-following");

    expect(patchEvent).toHaveBeenCalledWith("token-1", CALENDAR_ID, "master-1", { recurrence: ["RRULE:FREQ=WEEKLY;COUNT=2"] });
    expect(insertEvent).toHaveBeenCalledWith(
      "token-1",
      CALENDAR_ID,
      expect.objectContaining({ summary: INPUT.title, recurrence: ["RRULE:FREQ=WEEKLY;COUNT=8"] }),
    );
    expect(result.status).toBe("ok");
  });

  it("'esta y las siguientes' desde la primera ocurrencia es lo mismo que 'todas': no crea una serie nueva", async () => {
    vi.mocked(getEvent).mockResolvedValueOnce(
      googleEvent({ id: "master-1", start: { dateTime: "2026-08-03T10:00:00-03:00" }, recurrence: ["RRULE:FREQ=WEEKLY;COUNT=10"] }),
    );
    vi.mocked(patchEvent).mockResolvedValueOnce(googleEvent());

    await updateEvent(
      USER_ID,
      { ...target, originalStartTime: "2026-08-03T10:00:00-03:00" },
      INPUT,
      "this-and-following",
    );

    expect(patchEvent).toHaveBeenCalledTimes(1);
    expect(patchEvent).toHaveBeenCalledWith("token-1", CALENDAR_ID, "master-1", expect.objectContaining({ summary: INPUT.title }));
    expect(insertEvent).not.toHaveBeenCalled();
  });

  it("si falla crear la mitad futura, restaura la regla original en vez de dejar la serie cortada a mitad de camino", async () => {
    const originalRecurrence = ["RRULE:FREQ=WEEKLY;COUNT=10"];
    vi.mocked(getEvent).mockResolvedValueOnce(
      googleEvent({ id: "master-1", start: { dateTime: "2026-08-03T10:00:00-03:00" }, recurrence: originalRecurrence }),
    );
    vi.mocked(patchEvent).mockResolvedValueOnce(googleEvent()); // el truncado sí funciona
    vi.mocked(insertEvent).mockRejectedValueOnce(new GoogleTransientError("500", 500));
    vi.mocked(patchEvent).mockResolvedValueOnce(googleEvent()); // la restauración

    const result = await updateEvent(USER_ID, target, INPUT, "this-and-following");

    expect(result).toEqual({ status: "unavailable", reason: "transient" });
    expect(patchEvent).toHaveBeenCalledTimes(2);
    expect(patchEvent).toHaveBeenNthCalledWith(2, "token-1", CALENDAR_ID, "master-1", { recurrence: originalRecurrence });
  });

  it("un 429/500/token vencido de Google se traduce en 'unavailable', no en una excepción", async () => {
    vi.mocked(patchEvent).mockRejectedValueOnce(new GoogleTransientError("429", 429));
    await expect(updateEvent(USER_ID, target, INPUT, "all")).resolves.toEqual({ status: "unavailable", reason: "transient" });

    vi.mocked(patchEvent).mockRejectedValueOnce(new GoogleAccessTokenExpiredError("401"));
    await expect(updateEvent(USER_ID, target, INPUT, "all")).resolves.toEqual({ status: "unavailable", reason: "transient" });

    vi.mocked(patchEvent).mockRejectedValueOnce(new GoogleReauthRequiredError("invalid_grant"));
    await expect(updateEvent(USER_ID, target, INPUT, "all")).resolves.toEqual({ status: "unavailable", reason: "needs_reauth" });
  });
});

describe("deleteEvent — las tres formas de eliminar una serie (tarea 3.5, D-D)", () => {
  const target: OccurrenceTarget = {
    calendarId: CALENDAR_ID,
    eventId: "instancia-3",
    recurringEventId: "master-1",
    originalStartTime: "2026-08-17T10:00:00-03:00", // tercera ocurrencia de una serie de diez
  };

  beforeEach(() => {
    vi.mocked(resolveAccessToken).mockResolvedValue(readyState());
  });

  it("sin `scope` en una serie, tira RecurrenceScopeRequiredError", async () => {
    await expect(deleteEvent(USER_ID, target)).rejects.toBeInstanceOf(RecurrenceScopeRequiredError);
  });

  it("'esta ocurrencia' elimina solo la instancia", async () => {
    await deleteEvent(USER_ID, target, "this");
    expect(deleteGoogleEvent).toHaveBeenCalledWith("token-1", CALENDAR_ID, "instancia-3");
  });

  it("'todas' elimina la serie completa (el maestro)", async () => {
    await deleteEvent(USER_ID, target, "all");
    expect(deleteGoogleEvent).toHaveBeenCalledWith("token-1", CALENDAR_ID, "master-1");
  });

  it("'esta y las siguientes' en la tercera de diez: la primera y la segunda quedan, de la tercera en adelante se eliminan (spec)", async () => {
    vi.mocked(getEvent).mockResolvedValueOnce(
      googleEvent({ id: "master-1", start: { dateTime: "2026-08-03T10:00:00-03:00" }, recurrence: ["RRULE:FREQ=WEEKLY;COUNT=10"] }),
    );

    await deleteEvent(USER_ID, target, "this-and-following");

    expect(patchEvent).toHaveBeenCalledWith("token-1", CALENDAR_ID, "master-1", { recurrence: ["RRULE:FREQ=WEEKLY;COUNT=2"] });
    expect(deleteGoogleEvent).not.toHaveBeenCalled();
  });

  it("'esta y las siguientes' desde la primera ocurrencia elimina la serie entera", async () => {
    vi.mocked(getEvent).mockResolvedValueOnce(
      googleEvent({ id: "master-1", start: { dateTime: "2026-08-03T10:00:00-03:00" }, recurrence: ["RRULE:FREQ=WEEKLY;COUNT=10"] }),
    );

    await deleteEvent(USER_ID, { ...target, originalStartTime: "2026-08-03T10:00:00-03:00" }, "this-and-following");

    expect(deleteGoogleEvent).toHaveBeenCalledWith("token-1", CALENDAR_ID, "master-1");
    expect(patchEvent).not.toHaveBeenCalled();
  });

  it("un 429/500/token vencido de Google se traduce en 'unavailable', no en una excepción", async () => {
    vi.mocked(deleteGoogleEvent).mockRejectedValueOnce(new GoogleTransientError("500", 500));
    await expect(deleteEvent(USER_ID, target, "all")).resolves.toEqual({ status: "unavailable", reason: "transient" });

    vi.mocked(deleteGoogleEvent).mockRejectedValueOnce(new GoogleAccessTokenExpiredError("401"));
    await expect(deleteEvent(USER_ID, target, "all")).resolves.toEqual({ status: "unavailable", reason: "transient" });

    vi.mocked(deleteGoogleEvent).mockRejectedValueOnce(new GoogleReauthRequiredError("invalid_grant"));
    await expect(deleteEvent(USER_ID, target, "all")).resolves.toEqual({ status: "unavailable", reason: "needs_reauth" });
  });
});
