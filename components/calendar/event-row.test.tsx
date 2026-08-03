// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { CalendarEventInstance } from "@/lib/calendar/events";
import { EventRow } from "./event-row";

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
  defaultProjectId: null,
};

function event(overrides: Partial<CalendarEventInstance> = {}): CalendarEventInstance {
  return {
    id: "event-1",
    calendarId: "primary",
    calendarColor: "#a4bdfc",
    title: "Reunión con el equipo",
    description: null,
    location: null,
    allDay: false,
    start: "2026-08-05T11:00:00.000Z",
    end: "2026-08-05T12:00:00.000Z",
    timeZone: "America/Argentina/Buenos_Aires",
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    htmlLink: null,
    ...overrides,
  };
}

function renderRow(props: Partial<Parameters<typeof EventRow>[0]> = {}) {
  const onEdit = vi.fn();
  const onOpenInGoogleCalendar = vi.fn();
  const onDelete = vi.fn();
  render(
    <PreferencesProvider preferences={TEST_PREFERENCES}>
      <ul>
        <EventRow
          event={event()}
          calendarName="Trabajo"
          canEdit
          onEdit={onEdit}
          onOpenInGoogleCalendar={onOpenInGoogleCalendar}
          onDelete={onDelete}
          {...props}
        />
      </ul>
    </PreferencesProvider>,
  );
  return { onEdit, onOpenInGoogleCalendar, onDelete };
}

describe("EventRow (hoy-con-eventos, D-C)", () => {
  it("no dibuja ninguno de los cinco controles de tarea", () => {
    renderRow();

    // Ni casillero de completar, ni chevron de subtareas: ningún checkbox
    // ni botón "Mostrar/Ocultar subtareas" en la fila.
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mostrar subtareas|ocultar subtareas/i)).not.toBeInTheDocument();
    // Manija de arrastre: TaskRow la etiqueta "Reordenar {título}".
    expect(screen.queryByLabelText(/^reordenar/i)).not.toBeInTheDocument();
    // Casillero de selección: TaskRow usa aria-label "Seleccionar {título}".
    expect(screen.queryByLabelText(/^seleccionar/i)).not.toBeInTheDocument();
    // La marca de color no puede ser un punto redondo oculto a lectores:
    // es exactamente el selector con el que una prueba existente
    // (task-list.test.tsx) detecta el punto de prioridad.
    expect(document.querySelector(".rounded-full[aria-hidden]")).not.toBeInTheDocument();
  });

  it("el menú de acciones tiene solo editar, abrir en Google Calendar y eliminar", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: /más acciones para reunión con el equipo/i }));

    const menuItems = await screen.findAllByRole("menuitem");
    expect(menuItems.map((item) => item.textContent)).toEqual(["Editar", "Abrir en Google Calendar", "Eliminar"]);
  });

  it("doble clic en el título llama a onEdit", () => {
    const { onEdit } = renderRow();

    const titleButton = screen.getByRole("button", { name: "Reunión con el equipo" });
    fireEvent.doubleClick(titleButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("un clic simple con el mouse no llama a onEdit", () => {
    const { onEdit } = renderRow();

    const titleButton = screen.getByRole("button", { name: "Reunión con el equipo" });
    fireEvent.click(titleButton, { detail: 1 });

    expect(onEdit).not.toHaveBeenCalled();
  });

  it("de solo lectura: el menú no ofrece eliminar", async () => {
    const user = userEvent.setup();
    renderRow({ canEdit: false });

    await user.click(screen.getByRole("button", { name: /más acciones para reunión con el equipo/i }));

    const menuItems = await screen.findAllByRole("menuitem");
    expect(menuItems.map((item) => item.textContent)).toEqual(["Editar", "Abrir en Google Calendar"]);
  });
});
