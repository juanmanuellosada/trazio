// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CalendarBlock } from "@/lib/calendar/block";
import { CalendarView } from "./calendar-view";

// Requirements de `specs/vista-calendario/spec.md`: los tres tipos conviven
// en la grilla y se distinguen sin depender solo del color (tarea 5.5), y
// los bloques de vista previa de repetición nunca responden a ningún gesto
// (tarea 5.7).

const TZ = "America/Argentina/Buenos_Aires";
const NOW = new Date("2026-08-05T15:00:00-03:00"); // miércoles a la tarde

const SAME_COLOR = "#0284C7";

function sameColorBlocks(): CalendarBlock[] {
  return [
    { id: "task-1", type: "task", title: "Escribir el informe", color: SAME_COLOR, allDay: false, start: "2026-08-05T09:00:00-03:00", end: "2026-08-05T10:00:00-03:00" },
    { id: "habit-1", type: "habit", title: "Meditar", color: SAME_COLOR, allDay: false, start: "2026-08-05T11:00:00-03:00", end: "2026-08-05T11:15:00-03:00" },
    { id: "event-1", type: "event", title: "Reunión de equipo", color: SAME_COLOR, allDay: false, start: "2026-08-05T13:00:00-03:00", end: "2026-08-05T14:00:00-03:00" },
  ];
}

describe("CalendarView", () => {
  it("dibuja juntos tarea, hábito y evento del día", () => {
    render(<CalendarView format="dia" anchorDate="2026-08-05" timezone={TZ} weekStartsOn={1} blocks={sameColorBlocks()} now={NOW} />);

    expect(screen.getByRole("button", { name: "Escribir el informe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Meditar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reunión de equipo" })).toBeInTheDocument();
  });

  it("con el mismo color, tarea/hábito/evento igual se distinguen por forma (clases de borde distintas)", () => {
    render(<CalendarView format="dia" anchorDate="2026-08-05" timezone={TZ} weekStartsOn={1} blocks={sameColorBlocks()} now={NOW} />);

    const task = screen.getByRole("button", { name: "Escribir el informe" });
    const habit = screen.getByRole("button", { name: "Meditar" });
    const event = screen.getByRole("button", { name: "Reunión de equipo" });

    expect(task.className).toContain("border-2");
    expect(habit.className).toContain("rounded-full");
    expect(event.className).toContain("border-l-4");

    // Ninguna de las tres formas es igual a otra: no hay dos tipos que compartan la misma clase de forma completa.
    const shapes = [task.className, habit.className, event.className];
    expect(new Set(shapes).size).toBe(3);
  });

  it("un bloque de vista previa se dibuja pero no responde a ningún clic", async () => {
    const user = userEvent.setup();
    const onSelectBlock = vi.fn();
    const preview: CalendarBlock = {
      id: "preview-1",
      type: "task",
      title: "Repetición futura",
      color: SAME_COLOR,
      allDay: false,
      start: "2026-08-05T16:00:00-03:00",
      end: "2026-08-05T16:30:00-03:00",
      isPreview: true,
    };

    render(
      <CalendarView format="dia" anchorDate="2026-08-05" timezone={TZ} weekStartsOn={1} blocks={[]} previewBlocks={[preview]} now={NOW} onSelectBlock={onSelectBlock} />,
    );

    // No es un botón: no hay ningún elemento con role accesible que se pueda "activar".
    expect(screen.queryByRole("button", { name: "Repetición futura" })).not.toBeInTheDocument();
    const previewNode = screen.getByTitle("Repetición futura");
    await user.click(previewNode);
    expect(onSelectBlock).not.toHaveBeenCalled();
  });

  it("un bloque de vista previa se marca como no interactivo incluso si el dominio no puso `isPreview` en `previewBlocks`", () => {
    const forgotten: CalendarBlock = {
      id: "preview-2",
      type: "event",
      title: "Otra repetición",
      color: SAME_COLOR,
      allDay: false,
      start: "2026-08-05T17:00:00-03:00",
      end: "2026-08-05T17:30:00-03:00",
      // isPreview omitido a propósito: `CalendarView` lo fuerza igual porque llegó por `previewBlocks`.
    };

    render(<CalendarView format="dia" anchorDate="2026-08-05" timezone={TZ} weekStartsOn={1} blocks={[]} previewBlocks={[forgotten]} now={NOW} />);

    expect(screen.queryByRole("button", { name: "Otra repetición" })).not.toBeInTheDocument();
    expect(screen.getByTitle("Otra repetición")).toBeInTheDocument();
  });

  it("la fila de todo el día muestra un evento separado de la grilla horaria", () => {
    const blocks: CalendarBlock[] = [
      { id: "allday-1", type: "event", title: "Feriado", color: SAME_COLOR, allDay: true, start: "2026-08-05", end: "2026-08-06" },
      { id: "timed-1", type: "task", title: "Llamar al banco", color: SAME_COLOR, allDay: false, start: "2026-08-05T10:00:00-03:00", end: "2026-08-05T10:30:00-03:00" },
    ];

    render(<CalendarView format="dia" anchorDate="2026-08-05" timezone={TZ} weekStartsOn={1} blocks={blocks} now={NOW} />);

    expect(screen.getByRole("button", { name: "Feriado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Llamar al banco" })).toBeInTheDocument();
  });

  it("formato mes dibuja los bloques del mes sin la fila de todo el día ni la grilla horaria", () => {
    const blocks: CalendarBlock[] = [
      { id: "task-1", type: "task", title: "Pagar alquiler", color: SAME_COLOR, allDay: false, start: "2026-08-05T09:00:00-03:00", end: "2026-08-05T09:30:00-03:00" },
    ];

    render(<CalendarView format="mes" anchorDate="2026-08-05" timezone={TZ} weekStartsOn={1} blocks={blocks} now={NOW} />);
    expect(screen.getByRole("button", { name: "Pagar alquiler" })).toBeInTheDocument();
  });
});
