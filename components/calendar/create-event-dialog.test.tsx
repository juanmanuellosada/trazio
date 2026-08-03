// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { CreateEventDialog } from "./create-event-dialog";

/**
 * Alta de evento (`alta-de-evento-completa`, D-A/D-B/D-C): a diferencia de
 * antes, el formulario ya no muestra el horario como texto de solo lectura
 * — se puede corregir, elegir todo el día, repetición, descripción y
 * ubicación, sin ofrecer menos que editar.
 */

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));

const DEFAULT_CALENDARS = [{ id: "primary", summary: "Personal", backgroundColor: null, primary: true, accessRole: "owner" }];

// Estado mutable del hook, para poder variar los calendarios devueltos por
// test (calendarios de solo lectura) sin perder `CalendarAdminError` ni
// `canWriteCalendar`, que el resto del módulo real sigue exportando.
const mockCalendarsResult = vi.hoisted(() => ({
  data: { calendars: [] as unknown[] },
  isLoading: false,
  isError: false,
  error: null as unknown,
}));

vi.mock("@/lib/calendar/use-google-calendars", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/calendar/use-google-calendars")>();
  return { ...actual, useGoogleCalendars: () => mockCalendarsResult };
});

const PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderDialog() {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
    jsonResponse(201, { id: "evt-1", calendarId: "primary" }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={PREFERENCES}>
        <CreateEventDialog
          open
          onOpenChange={vi.fn()}
          start={new Date("2026-08-05T13:00:00.000Z")}
          end={new Date("2026-08-05T14:00:00.000Z")}
          timezone="America/Argentina/Buenos_Aires"
        />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
  return fetchMock;
}

describe("CreateEventDialog (alta-de-evento-completa)", () => {
  beforeEach(() => {
    mockCalendarsResult.data = { calendars: [...DEFAULT_CALENDARS] };
    mockCalendarsResult.isLoading = false;
    mockCalendarsResult.isError = false;
    mockCalendarsResult.error = null;
  });

  it("el horario ya no es de solo lectura: hay campos de fecha y hora, no un texto fijo", async () => {
    renderDialog();

    expect(await screen.findByLabelText("Fecha en que empieza")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Hora", { selector: "input" })).toHaveLength(2);
  });

  it("crear con título y calendario, sin tocar nada más, manda el rango propuesto", async () => {
    const user = userEvent.setup();
    const fetchMock = renderDialog();

    await user.type(screen.getByLabelText("Título"), "Reunión de equipo");
    await user.click(screen.getByRole("button", { name: "Crear evento" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/calendar/events");
    const body = JSON.parse(init!.body as string);
    expect(body.title).toBe("Reunión de equipo");
    expect(body.calendarId).toBe("primary");
    expect(body.allDay).toBe(false);
    expect(body.recurrence).toBeNull();
  });

  it("activar todo el día saca los campos de hora y crea el evento sin horas", async () => {
    const user = userEvent.setup();
    const fetchMock = renderDialog();

    await user.type(screen.getByLabelText("Título"), "Feriado");
    await user.click(screen.getByRole("switch", { name: "Todo el día" }));

    expect(screen.queryByLabelText("Hora", { selector: "input" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Crear evento" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init!.body as string);
    expect(body.allDay).toBe(true);
    expect(body.start).toBe("2026-08-05");
  });

  it("elegir una repetición rápida crea el evento como serie", async () => {
    const user = userEvent.setup();
    const fetchMock = renderDialog();

    await user.type(screen.getByLabelText("Título"), "Reunión semanal");
    await user.click(screen.getByRole("combobox", { name: "Repetición" }));
    await user.click(await screen.findByRole("option", { name: /Cada semana/ }));
    await user.click(screen.getByRole("button", { name: "Crear evento" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init!.body as string);
    expect(body.recurrence.rule).toMatch(/^FREQ=WEEKLY/);
  });

  it("no ofrece invitados ni adjuntar archivos (D-E)", async () => {
    renderDialog();

    expect(screen.queryByText(/invitad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/adjunt/i)).not.toBeInTheDocument();
  });

  // `sin-controles-nativos`: mismo criterio de auditoría en lo renderizado
  // que `tests/native-date-time-controls-rendered.test.tsx`, acá para el
  // alta, que antes no tenía ningún campo de fecha/hora propio que auditar.
  it("no usa ningún control nativo del navegador (fecha, hora, ni <select>)", async () => {
    renderDialog();
    await screen.findByLabelText("Fecha en que empieza");

    const offenders = document.body.querySelectorAll('input[type="date"], input[type="time"], input[type="datetime-local"], select');
    expect(Array.from(offenders).map((el) => el.outerHTML)).toEqual([]);
  });

  // Crear un evento en un calendario de solo lectura Google lo rechaza
  // (403): mismo defecto que ya se arregló para "eliminar calendario"
  // (`calendars-section.tsx`), acá aplicado al selector de calendario del
  // formulario de evento.
  describe("calendarios de solo lectura no se ofrecen como destino", () => {
    it("no ofrece un calendario de solo lectura entre las opciones", async () => {
      mockCalendarsResult.data = {
        calendars: [
          { id: "primary", summary: "Personal", backgroundColor: null, primary: true, accessRole: "owner" },
          { id: "feriados", summary: "Feriados", backgroundColor: null, primary: false, accessRole: "reader" },
        ],
      };
      const user = userEvent.setup();
      renderDialog();

      const trigger = await screen.findByRole("combobox", { name: "Calendario" });
      await user.click(trigger);

      expect(await screen.findByRole("option", { name: "Personal" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Feriados" })).not.toBeInTheDocument();
    });

    it("si el calendario primario es de solo lectura, no lo deja seleccionado por default", async () => {
      mockCalendarsResult.data = {
        calendars: [
          { id: "primary", summary: "Personal", backgroundColor: null, primary: true, accessRole: "reader" },
          { id: "trabajo", summary: "Trabajo", backgroundColor: null, primary: false, accessRole: "writer" },
        ],
      };
      const user = userEvent.setup();
      const fetchMock = renderDialog();

      expect(await screen.findByRole("combobox", { name: "Calendario" })).toHaveTextContent("Trabajo");

      await user.type(screen.getByLabelText("Título"), "Reunión");
      await user.click(screen.getByRole("button", { name: "Crear evento" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/calendar/events", expect.anything()));
      const [, init] = fetchMock.mock.calls.find(([url]) => url === "/api/calendar/events")!;
      const body = JSON.parse(init!.body as string);
      expect(body.calendarId).toBe("trabajo");
    });

    it("si no hay ningún calendario donde escribir, no deja crear y lo explica", async () => {
      mockCalendarsResult.data = {
        calendars: [{ id: "primary", summary: "Personal", backgroundColor: null, primary: true, accessRole: "reader" }],
      };
      renderDialog();

      expect(await screen.findByText(/no tenés ningún calendario donde puedas escribir/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Crear evento" })).not.toBeInTheDocument();
    });
  });
});
