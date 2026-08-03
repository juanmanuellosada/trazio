// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CalendarEventInstance } from "@/lib/calendar/events";
import { useHoyEvents } from "./use-hoy-events";

const todayEventsMock = vi.fn();
const googleCalendarsMock = vi.fn();

vi.mock("@/lib/calendar/use-today-events", () => ({
  useTodayEvents: (...args: unknown[]) => todayEventsMock(...args),
}));
vi.mock("@/lib/calendar/use-google-calendars", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/calendar/use-google-calendars")>();
  return { ...actual, useGoogleCalendars: () => googleCalendarsMock() };
});

function event(overrides: Partial<CalendarEventInstance> = {}): CalendarEventInstance {
  return {
    id: "event-1",
    calendarId: "cal-1",
    calendarColor: "#039BE5",
    title: "Reunión",
    description: null,
    location: null,
    allDay: false,
    start: "2026-08-05T13:00:00.000Z",
    end: "2026-08-05T14:00:00.000Z",
    timeZone: "America/Argentina/Buenos_Aires",
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    htmlLink: null,
    ...overrides,
  };
}

describe("useHoyEvents (hoy-con-eventos, puente hacia components/calendar/)", () => {
  it("cargando o con error de red: 'loading', igual que sin conectar visualmente (D-E)", () => {
    todayEventsMock.mockReturnValue({ isPending: true, isError: false, data: undefined });
    googleCalendarsMock.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useHoyEvents("2026-08-05", "America/Argentina/Buenos_Aires"));
    expect(result.current).toEqual({ status: "loading" });
  });

  it("sin conectar: 'not_connected', distinto de 'unavailable'", () => {
    todayEventsMock.mockReturnValue({ isPending: false, isError: false, data: { status: "not_connected" } });
    googleCalendarsMock.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useHoyEvents("2026-08-05", "America/Argentina/Buenos_Aires"));
    expect(result.current).toEqual({ status: "not_connected" });
  });

  it("Google caído: 'unavailable' con el motivo", () => {
    todayEventsMock.mockReturnValue({ isPending: false, isError: false, data: { status: "unavailable", reason: "transient" } });
    googleCalendarsMock.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useHoyEvents("2026-08-05", "America/Argentina/Buenos_Aires"));
    expect(result.current).toEqual({ status: "unavailable", reason: "transient" });
  });

  it("ok: calendarName resuelve el nombre del calendario, o 'Calendario' si no lo encuentra", () => {
    todayEventsMock.mockReturnValue({ isPending: false, isError: false, data: { status: "ok", events: [event()] } });
    googleCalendarsMock.mockReturnValue({
      data: { calendars: [{ id: "cal-1", summary: "Trabajo", backgroundColor: null, primary: false, accessRole: "owner" }] },
    });
    const { result } = renderHook(() => useHoyEvents("2026-08-05", "America/Argentina/Buenos_Aires"));
    if (result.current.status !== "ok") throw new Error("esperaba status ok");
    expect(result.current.calendarName("cal-1")).toBe("Trabajo");
    expect(result.current.calendarName("cal-desconocido")).toBe("Calendario");
  });

  it("ok: canEdit cruza contra accessRole del calendario (D-D)", () => {
    todayEventsMock.mockReturnValue({ isPending: false, isError: false, data: { status: "ok", events: [] } });
    googleCalendarsMock.mockReturnValue({
      data: {
        calendars: [
          { id: "cal-writer", summary: "Trabajo", backgroundColor: null, primary: false, accessRole: "writer" },
          { id: "cal-reader", summary: "Compartido", backgroundColor: null, primary: false, accessRole: "reader" },
        ],
      },
    });
    const { result } = renderHook(() => useHoyEvents("2026-08-05", "America/Argentina/Buenos_Aires"));
    if (result.current.status !== "ok") throw new Error("esperaba status ok");
    expect(result.current.canEdit(event({ calendarId: "cal-writer" }))).toBe(true);
    expect(result.current.canEdit(event({ calendarId: "cal-reader" }))).toBe(false);
  });

  it("ok pero la lista de calendarios todavía no cargó: canEdit es conservador (false)", () => {
    todayEventsMock.mockReturnValue({ isPending: false, isError: false, data: { status: "ok", events: [event()] } });
    googleCalendarsMock.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useHoyEvents("2026-08-05", "America/Argentina/Buenos_Aires"));
    if (result.current.status !== "ok") throw new Error("esperaba status ok");
    expect(result.current.canEdit(event())).toBe(false);
  });
});
