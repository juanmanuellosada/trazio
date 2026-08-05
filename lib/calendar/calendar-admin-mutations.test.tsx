// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { googleCalendarsQueryKey, type GoogleCalendarsData } from "./use-google-calendars";
import { useUpdateEnabledCalendars } from "./calendar-admin-mutations";

// Segundo defecto encontrado al verificar el grupo 7 de
// `calendario-legible-y-manipulable`: sin optimistic update, tildar dos
// calendarios en sucesión rápida (sin esperar a que el primero asiente)
// hacía que el segundo calculara el próximo array desde el `enabledCalendarIds`
// de ANTES del primero (el caché todavía no se había puesto al día), y lo
// pisaba al resolver. `useUpdateEnabledCalendars` pasa a ser optimista, mismo
// patrón de `onMutate`/`onError` que `useUpdateEvent`.

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const DATA: GoogleCalendarsData = {
  calendars: [
    { id: "cal-a", summary: "Personal", backgroundColor: "#4285f4", primary: true, accessRole: "owner" },
    { id: "cal-b", summary: "Trabajo", backgroundColor: "#33b679", primary: false, accessRole: "owner" },
  ],
  enabledCalendarIds: [],
  connected: true,
};

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useUpdateEnabledCalendars", () => {
  it("parchea enabledCalendarIds en el caché al instante (optimistic update)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); // nunca resuelve: solo importa el estado optimista
    const queryClient = new QueryClient();
    queryClient.setQueryData(googleCalendarsQueryKey, DATA);

    const { result } = renderHook(() => useUpdateEnabledCalendars(), { wrapper: wrapper(queryClient) });

    act(() => {
      result.current.mutate(["cal-a"]);
    });

    await waitFor(() => {
      expect(queryClient.getQueryData<GoogleCalendarsData>(googleCalendarsQueryKey)?.enabledCalendarIds).toEqual(["cal-a"]);
    });
  });

  it("un segundo tilde inmediato ya parte de lo que dejó el primero, no del valor de antes del primero (defecto real)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); // ninguna de las dos mutaciones resuelve durante el test
    const queryClient = new QueryClient();
    queryClient.setQueryData(googleCalendarsQueryKey, DATA);

    const { result } = renderHook(() => useUpdateEnabledCalendars(), { wrapper: wrapper(queryClient) });

    // Primer tilde: habilita "cal-a".
    act(() => {
      result.current.mutate(["cal-a"]);
    });
    await waitFor(() => {
      expect(queryClient.getQueryData<GoogleCalendarsData>(googleCalendarsQueryKey)?.enabledCalendarIds).toEqual(["cal-a"]);
    });

    // Segundo tilde, calculado (como `toggleCalendarEnabled`) a partir de lo
    // que el caché tiene AHORA: con el parche optimista ya aplicado, esto ya
    // incluye "cal-a" — antes del arreglo, el caché seguía en `[]` acá.
    const currentEnabled = queryClient.getQueryData<GoogleCalendarsData>(googleCalendarsQueryKey)!.enabledCalendarIds;
    act(() => {
      result.current.mutate([...currentEnabled, "cal-b"]);
    });

    await waitFor(() => {
      expect(queryClient.getQueryData<GoogleCalendarsData>(googleCalendarsQueryKey)?.enabledCalendarIds).toEqual(["cal-a", "cal-b"]);
    });
  });

  it("si el servidor rechaza, revierte el caché a como estaba", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(502, { error: "google_transient" })));
    const queryClient = new QueryClient();
    queryClient.setQueryData(googleCalendarsQueryKey, DATA);

    const { result } = renderHook(() => useUpdateEnabledCalendars(), { wrapper: wrapper(queryClient) });

    await act(async () => {
      result.current.mutate(["cal-a"]);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<GoogleCalendarsData>(googleCalendarsQueryKey)).toEqual(DATA);
  });
});
