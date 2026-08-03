// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEventInstance, EventsResult } from "./events";
import { useDeleteEvent } from "./use-delete-event";

// Primer camino de borrado de evento de toda la app (D-D de
// `hoy-con-eventos`, tarea 4.3): `deleteEvent`/la ruta `DELETE
// /api/calendar/events/[eventId]` ya existían, pero ningún cliente los
// llamaba. Sin optimistic update (a diferencia de `useUpdateEvent`): se
// espera la confirmación del servidor, mismo criterio que
// `useDeleteCalendar`.

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
  htmlLink: null,
};

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function seedTodayQuery(queryClient: QueryClient, events: CalendarEventInstance[]) {
  const result: EventsResult = { status: "ok", events };
  queryClient.setQueryData(["calendar-events", "today", "2026-08-05", "America/Argentina/Buenos_Aires"], result);
}

describe("useDeleteEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("manda calendarId/recurringEventId/originalStartTime/scope como query string a la ruta del evento", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient();

    const { result } = renderHook(() => useDeleteEvent(), { wrapper: wrapper(queryClient) });

    await act(async () => {
      result.current.mutate({
        target: { calendarId: "primary", eventId: "event-1", recurringEventId: "series-1", originalStartTime: "2026-08-05T10:00:00.000Z" },
        scope: "this-and-following",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "/api/calendar/events/event-1?calendarId=primary&recurringEventId=series-1&originalStartTime=2026-08-05T10%3A00%3A00.000Z&scope=this-and-following",
    );
    expect(init).toMatchObject({ method: "DELETE" });
  });

  it("al eliminar un evento simple, no manda recurringEventId ni originalStartTime ni scope", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient();

    const { result } = renderHook(() => useDeleteEvent(), { wrapper: wrapper(queryClient) });

    await act(async () => {
      result.current.mutate({ target: { calendarId: "primary", eventId: "event-1", recurringEventId: null, originalStartTime: null } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith("/api/calendar/events/event-1?calendarId=primary", expect.objectContaining({ method: "DELETE" }));
  });

  it("al terminar bien, saca el evento de cualquier caché de eventos que lo tenga (rango y hoy)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, { ok: true })));
    const queryClient = new QueryClient();
    seedTodayQuery(queryClient, [EVENT]);

    const { result } = renderHook(() => useDeleteEvent(), { wrapper: wrapper(queryClient) });

    await act(async () => {
      result.current.mutate({ target: { calendarId: "primary", eventId: "event-1", recurringEventId: null, originalStartTime: null } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      queryClient.getQueryData<EventsResult>(["calendar-events", "today", "2026-08-05", "America/Argentina/Buenos_Aires"]),
    ).toEqual({ status: "ok", events: [] });
  });

  it("si el servidor rechaza, no hace nada más que avisar (sin optimistic update que revertir)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(502, { error: "google_transient" })));
    const queryClient = new QueryClient();
    seedTodayQuery(queryClient, [EVENT]);

    const { result } = renderHook(() => useDeleteEvent(), { wrapper: wrapper(queryClient) });

    await act(async () => {
      result.current.mutate({ target: { calendarId: "primary", eventId: "event-1", recurringEventId: null, originalStartTime: null } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(
      queryClient.getQueryData<EventsResult>(["calendar-events", "today", "2026-08-05", "America/Argentina/Buenos_Aires"]),
    ).toEqual({ status: "ok", events: [EVENT] });
  });
});
