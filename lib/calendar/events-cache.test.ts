import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEventsCacheForTests, getCached, invalidateCalendar, setCached } from "./events-cache";

// Tarea 3.2, D-C: caché en memoria de 60 segundos. Los escenarios de
// "vuelve a consultar Google" en sí están cubiertos por
// `lib/calendar/events.test.ts`; acá se prueba el mecanismo del caché en
// aislamiento.

beforeEach(() => {
  clearEventsCacheForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getCached/setCached", () => {
  it("devuelve lo guardado antes de que venza", () => {
    setCached("k", { valor: 1 });
    expect(getCached("k")).toEqual({ valor: 1 });
  });

  it("devuelve undefined para una clave que nunca se guardó", () => {
    expect(getCached("no-existe")).toBeUndefined();
  });

  it("vencido el TTL, no devuelve el valor viejo como si fuera vigente (D1: sin caché offline)", () => {
    vi.useFakeTimers();
    setCached("k", "viejo", 1000);
    vi.advanceTimersByTime(1001);
    expect(getCached("k")).toBeUndefined();
  });
});

describe("invalidateCalendar", () => {
  it("borra solo las entradas del calendario dado, sin tocar otros calendarios ni otros usuarios", () => {
    setCached("user-1:cal-a:2026-08-01:2026-08-31", ["a"]);
    setCached("user-1:cal-b:2026-08-01:2026-08-31", ["b"]);
    setCached("user-2:cal-a:2026-08-01:2026-08-31", ["otro-usuario"]);

    invalidateCalendar("user-1", "cal-a");

    expect(getCached("user-1:cal-a:2026-08-01:2026-08-31")).toBeUndefined();
    expect(getCached("user-1:cal-b:2026-08-01:2026-08-31")).toEqual(["b"]);
    expect(getCached("user-2:cal-a:2026-08-01:2026-08-31")).toEqual(["otro-usuario"]);
  });
});
