import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAccessTokenExpiredError, GoogleTransientError } from "./google-client";
import { deleteEvent, getEvent, insertEvent, listEventInstances, patchEvent } from "./events-google";

// Tarea 2.8/3.9 aplicado a eventos: API de Google simulada con `fetch`
// mockeado. No hay credenciales reales todavía (grupo 0 pendiente), así que
// nada de este archivo se probó contra Google — ver el informe final del
// agente para el detalle de qué falta verificar cuando existan.

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("events-google", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("listEventInstances", () => {
    it("pide singleEvents=true y orderBy=startTime, y devuelve los items", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { items: [{ id: "e1", summary: "Reunión", start: {}, end: {} }] }));

      const events = await listEventInstances("token", "cal-1", "2026-08-01T00:00:00Z", "2026-08-31T00:00:00Z");

      expect(events).toHaveLength(1);
      const [url] = vi.mocked(fetch).mock.calls[0];
      expect(String(url)).toContain("singleEvents=true");
      expect(String(url)).toContain("orderBy=startTime");
      expect(String(url)).toContain(encodeURIComponent("cal-1"));
    });

    it("reintenta una vez ante 429 y no una segunda vez si vuelve a fallar", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(429, {})).mockResolvedValueOnce(jsonResponse(429, {}));

      const promise = listEventInstances("token", "cal-1", "a", "b");
      // La aserción se engancha antes de avanzar los timers falsos: si se
      // espera runAllTimersAsync primero, el rechazo ocurre sin que nada lo
      // esté escuchando todavía (mismo cuidado que google-client.test.ts).
      const assertion = expect(promise).rejects.toThrow(GoogleTransientError);
      await vi.runAllTimersAsync();
      await assertion;
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("un 500 es una falla transitoria", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(500, {}));
      await expect(listEventInstances("token", "cal-1", "a", "b")).rejects.toThrow(GoogleTransientError);
    });

    it("un 401 (token vencido) es un error específico, distinto de una falla transitoria", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(401, {}));
      await expect(listEventInstances("token", "cal-1", "a", "b")).rejects.toThrow(GoogleAccessTokenExpiredError);
    });
  });

  describe("getEvent", () => {
    it("devuelve el evento, incluida su `recurrence`", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse(200, { id: "master-1", summary: "Reunión semanal", start: { dateTime: "2026-08-03T10:00:00-03:00" }, end: {}, recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO"] }),
      );

      const master = await getEvent("token", "cal-1", "master-1");

      expect(master.recurrence).toEqual(["RRULE:FREQ=WEEKLY;BYDAY=MO"]);
    });
  });

  describe("insertEvent", () => {
    it("hace POST con el cuerpo dado y devuelve el evento creado", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { id: "nuevo", summary: "Nuevo", start: {}, end: {} }));

      const body = { summary: "Nuevo", description: null, location: null, start: { date: "2026-08-03" }, end: { date: "2026-08-03" } };
      const created = await insertEvent("token", "cal-1", body);

      expect(created.id).toBe("nuevo");
      const [, init] = vi.mocked(fetch).mock.calls[0];
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init!.body as string)).toEqual(body);
    });
  });

  describe("patchEvent", () => {
    it("hace PATCH solo con los campos dados", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { id: "e1", summary: "Editado", start: {}, end: {} }));

      await patchEvent("token", "cal-1", "e1", { recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=2"] });

      const [, init] = vi.mocked(fetch).mock.calls[0];
      expect(init?.method).toBe("PATCH");
      expect(JSON.parse(init!.body as string)).toEqual({ recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=2"] });
    });
  });

  describe("deleteEvent", () => {
    it("hace DELETE", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
      await expect(deleteEvent("token", "cal-1", "e1")).resolves.toBeUndefined();
      expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("DELETE");
    });

    it("un 410 (ya eliminado) se trata como éxito: es idempotente", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 410 }));
      await expect(deleteEvent("token", "cal-1", "e1")).resolves.toBeUndefined();
    });

    it("un 500 es una falla transitoria", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(500, {}));
      await expect(deleteEvent("token", "cal-1", "e1")).rejects.toThrow(GoogleTransientError);
    });
  });
});
