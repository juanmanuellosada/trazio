// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEventInstance, EventInput, EventsResult } from "./events";
import { useUpdateEvent } from "./use-update-event";

// Tarea 8.4/D24: `useUpdateEvent` es el camino que cierra el hueco que la
// tarea 7.11 dejó documentado (mover/redimensionar un evento solo avisaba
// con un toast). Optimistic update + reversión (`.claude/rules/frontend.md`)
// sobre el caché de `useCalendarRangeEvents`.

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const EVENT: CalendarEventInstance = {
  id: "event-1",
  calendarId: "primary",
  calendarColor: "#039BE5",
  title: "Reunión",
  description: null,
  location: null,
  allDay: false,
  start: "2026-08-05T10:00:00.000Z",
  end: "2026-08-05T11:00:00.000Z",
  timeZone: "America/Argentina/Buenos_Aires",
  isRecurring: false,
  recurringEventId: null,
  originalStartTime: null,
};

const CHANGES: EventInput = {
  calendarId: "primary",
  title: "Reunión",
  description: null,
  location: null,
  allDay: false,
  start: "2026-08-05T14:00:00.000Z",
  end: "2026-08-05T15:00:00.000Z",
  timeZone: "America/Argentina/Buenos_Aires",
};

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function seedRangeQuery(queryClient: QueryClient, events: CalendarEventInstance[]) {
  const result: EventsResult = { status: "ok", events };
  queryClient.setQueryData(["calendar-events", "range", "2026-08-03T00:00:00.000Z", "2026-08-10T00:00:00.000Z"], result);
}

describe("useUpdateEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parchea el evento al instante en cualquier caché de rango que lo tenga (optimistic update)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})), // nunca resuelve: solo importa el estado optimista
    );
    const queryClient = new QueryClient();
    seedRangeQuery(queryClient, [EVENT]);

    const { result } = renderHook(() => useUpdateEvent(), { wrapper: wrapper(queryClient) });

    act(() => {
      result.current.mutate({
        target: { calendarId: EVENT.calendarId, eventId: EVENT.id, recurringEventId: null, originalStartTime: null },
        changes: CHANGES,
      });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<EventsResult>([
        "calendar-events",
        "range",
        "2026-08-03T00:00:00.000Z",
        "2026-08-10T00:00:00.000Z",
      ]);
      expect(cached).toEqual({ status: "ok", events: [{ ...EVENT, ...CHANGES }] });
    });
  });

  it("si el servidor rechaza, revierte el caché a como estaba", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(502, { error: "google_transient" })));
    const queryClient = new QueryClient();
    seedRangeQuery(queryClient, [EVENT]);
    const key = ["calendar-events", "range", "2026-08-03T00:00:00.000Z", "2026-08-10T00:00:00.000Z"];

    const { result } = renderHook(() => useUpdateEvent(), { wrapper: wrapper(queryClient) });

    await act(async () => {
      result.current.mutate({
        target: { calendarId: EVENT.calendarId, eventId: EVENT.id, recurringEventId: null, originalStartTime: null },
        changes: CHANGES,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<EventsResult>(key)).toEqual({ status: "ok", events: [EVENT] });
  });

  it("manda calendarId/recurringEventId/originalStartTime/scope/changes al PATCH de la ruta del evento", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { ...EVENT, ...CHANGES }));
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient();

    const { result } = renderHook(() => useUpdateEvent(), { wrapper: wrapper(queryClient) });

    await act(async () => {
      result.current.mutate({
        target: { calendarId: "primary", eventId: "event-1", recurringEventId: "series-1", originalStartTime: "2026-08-05T10:00:00.000Z" },
        changes: CHANGES,
        scope: "this-and-following",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/calendar/events/event-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          calendarId: "primary",
          recurringEventId: "series-1",
          originalStartTime: "2026-08-05T10:00:00.000Z",
          scope: "this-and-following",
          changes: CHANGES,
        }),
      }),
    );
  });
});
