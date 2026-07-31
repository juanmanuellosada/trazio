import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAccessTokenExpiredError, GoogleTransientError } from "./google-client";
import {
  GoogleInsufficientPermissionError,
  createCalendar,
  deleteCalendar,
  listCalendarColorOptions,
  recolorCalendar,
  renameCalendar,
} from "./google-calendars-client";

// Tarea 4.1/4.5: tests del ABM de calendarios con la API de Google
// simulada. No hay credenciales reales todavía (grupo 0 pendiente), así que
// todo acá pasa por un `fetch` mockeado — mismo criterio que
// `google-client.test.ts`. Ver el informe final del agente para el detalle
// de qué falta verificar contra Google real.

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createCalendar", () => {
  it("crea un calendario con el nombre indicado", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { id: "abc@group.calendar.google.com", summary: "Personal" }));

    const created = await createCalendar("access-token-valido", "Personal");

    expect(created).toEqual({ id: "abc@group.calendar.google.com", summary: "Personal" });
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ summary: "Personal" });
  });

  it("un access token vencido lanza GoogleAccessTokenExpiredError", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(401, { error: { message: "Invalid Credentials" } }));

    await expect(createCalendar("access-token-vencido", "Personal")).rejects.toBeInstanceOf(
      GoogleAccessTokenExpiredError,
    );
  });

  it("un 403 lanza GoogleInsufficientPermissionError, distinguible de un token vencido", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(403, { error: { message: "Insufficient Permission" } }));

    await expect(createCalendar("access-token-valido", "Personal")).rejects.toBeInstanceOf(
      GoogleInsufficientPermissionError,
    );
  });

  it("un 500 es una falla transitoria", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(500, { error: { message: "Backend Error" } }));

    await expect(createCalendar("access-token-valido", "Personal")).rejects.toBeInstanceOf(GoogleTransientError);
  });

  it("un 429 se reintenta una vez y, si el reintento funciona, no falla", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(429, { error: "rate_limit_exceeded" }))
      .mockResolvedValueOnce(jsonResponse(200, { id: "abc", summary: "Personal" }));

    const promise = createCalendar("access-token-valido", "Personal");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ id: "abc", summary: "Personal" });
    expect(fetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe("renameCalendar", () => {
  it("manda el nombre nuevo con PATCH al calendario indicado", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { id: "cal-1", summary: "Oficina" }));

    await renameCalendar("access-token-valido", "cal-1", "Oficina");

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/cal-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ summary: "Oficina" });
  });

  it("codifica el id del calendario en la URL", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, {}));

    await renameCalendar("access-token-valido", "alguien@gmail.com", "Oficina");

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/alguien%40gmail.com");
  });

  it("un 500 al renombrar es transitorio", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(500, {}));

    await expect(renameCalendar("access-token-valido", "cal-1", "Oficina")).rejects.toBeInstanceOf(
      GoogleTransientError,
    );
  });
});

describe("deleteCalendar", () => {
  it("elimina el calendario indicado con DELETE", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(emptyResponse(204));

    await deleteCalendar("access-token-valido", "cal-1");

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/cal-1");
    expect(init.method).toBe("DELETE");
  });

  it("un 404 se trata como éxito: el calendario ya no está, que era el resultado buscado", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(emptyResponse(404));

    await expect(deleteCalendar("access-token-valido", "cal-1")).resolves.toBeUndefined();
  });

  it("un 403 al eliminar lanza GoogleInsufficientPermissionError", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(emptyResponse(403));

    await expect(deleteCalendar("access-token-valido", "cal-1")).rejects.toBeInstanceOf(
      GoogleInsufficientPermissionError,
    );
  });
});

describe("listCalendarColorOptions", () => {
  it("devuelve la sección `calendar` de /colors, no la de `event`", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        calendar: {
          "1": { background: "#ac725e", foreground: "#1d1d1d" },
          "2": { background: "#d06b64", foreground: "#1d1d1d" },
        },
        event: {
          "1": { background: "#000000", foreground: "#ffffff" },
        },
      }),
    );

    const colors = await listCalendarColorOptions("access-token-valido");

    expect(colors).toEqual([
      { id: "1", background: "#ac725e", foreground: "#1d1d1d" },
      { id: "2", background: "#d06b64", foreground: "#1d1d1d" },
    ]);
  });
});

describe("recolorCalendar", () => {
  it("manda el colorId con PATCH a la entrada de calendarList, no al calendario", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, {}));

    await recolorCalendar("access-token-valido", "cal-1", "5");

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/users/me/calendarList/cal-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ colorId: "5" });
  });

  it("un access token vencido lanza GoogleAccessTokenExpiredError", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(401, {}));

    await expect(recolorCalendar("access-token-vencido", "cal-1", "5")).rejects.toBeInstanceOf(
      GoogleAccessTokenExpiredError,
    );
  });
});
