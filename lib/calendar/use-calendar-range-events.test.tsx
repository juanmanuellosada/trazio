// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEventInstance, EventsResult } from "./events";
import { useCalendarRangeEvents } from "./use-calendar-range-events";

// Tarea 5.1/5.3 (`design.md` decisión 4): el rango visible se pide por
// trozos de semana ISO, no por un único pedido con el rango exacto — esto
// verifica que se dispara un pedido por trozo, que dos trozos vecinos se
// combinan en un solo resultado sin duplicar un evento que aparece en los
// dos, y que un trozo "no disponible" gana sobre el resto.

const TZ = "America/Argentina/Buenos_Aires";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function event(id: string): CalendarEventInstance {
  return {
    id,
    calendarId: "primary",
    calendarColor: null,
    title: id,
    description: null,
    location: null,
    allDay: false,
    start: "2026-08-05T10:00:00.000Z",
    end: "2026-08-05T11:00:00.000Z",
    timeZone: TZ,
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    htmlLink: null,
  };
}

describe("useCalendarRangeEvents", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pide un trozo por cada semana ISO que cubre el rango visible con margen, y combina los resultados", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ status: "ok", events: [] } satisfies EventsResult)));

    // Un solo día visible: con dos semanas de margen a cada lado, cubre 5 trozos.
    const { result } = renderHook(() => useCalendarRangeEvents(["2026-08-05"], TZ), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.data).toEqual({ status: "ok", events: [] }));
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("un evento que aparece en dos trozos vecinos no se duplica en el resultado combinado", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const shared = event("shared-event");
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ status: "ok", events: [shared] } satisfies EventsResult)));

    const { result } = renderHook(() => useCalendarRangeEvents(["2026-08-05"], TZ), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.data?.status).toBe("ok");
      expect(result.current.data?.status === "ok" && result.current.data.events).toHaveLength(1);
    });
  });

  it("si algún trozo no está disponible, el resultado combinado es 'unavailable'", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    let call = 0;
    fetchMock.mockImplementation(() => {
      call += 1;
      const body: EventsResult = call === 1 ? { status: "unavailable", reason: "needs_reauth" } : { status: "ok", events: [] };
      return Promise.resolve(jsonResponse(body));
    });

    const { result } = renderHook(() => useCalendarRangeEvents(["2026-08-05"], TZ), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.data?.status).toBe("unavailable"));
  });

  it("sin días visibles no dispara ningún pedido", () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const { result } = renderHook(() => useCalendarRangeEvents([], TZ), { wrapper: wrapper() });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});
