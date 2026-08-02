// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
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
vi.mock("@/lib/calendar/use-google-calendars", () => ({
  useGoogleCalendars: () => ({
    data: { calendars: [{ id: "primary", summary: "Personal", backgroundColor: null, primary: true, accessRole: "owner" }] },
    isLoading: false,
    isError: false,
  }),
}));

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
});
