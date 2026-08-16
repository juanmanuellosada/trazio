// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { differenceInCalendarDays, parseISO } from "date-fns";
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


// Reporte del dueño: "una tarea de todo el día en modo calendario no se
// puede arrastrar a otro día. Se puede, pero dándole un horario" — los
// únicos destinos de arrastre eran las columnas horarias, así que la fila
// de todo el día no recibía nada.

const COLUMN_WIDTH_PX = 200;
const ALL_DAY_TOP_PX = 30;
const ALL_DAY_BOTTOM_PX = 56;

/**
 * jsdom no hace layout: sin esto todos los rectángulos miden 0×0 y la
 * detección de colisiones de dnd-kit nunca encuentra un destino. Se le
 * inventa una geometría mínima y creíble a las piezas que participan del
 * gesto: una columna por día a lo ancho, la fila de todo el día arriba y la
 * grilla horaria debajo, sin superponerse en el eje vertical.
 */
function stubGridLayout(firstDay: string) {
  const original = Element.prototype.getBoundingClientRect;
  function columnLeft(dateKey: string): number {
    return differenceInCalendarDays(parseISO(dateKey), parseISO(firstDay)) * COLUMN_WIDTH_PX;
  }
  Element.prototype.getBoundingClientRect = function getBoundingClientRect(this: Element) {
    const allDayDate = this.getAttribute("data-all-day-drop");
    const dayDate = this.getAttribute("data-date");
    const dateKey = allDayDate ?? dayDate;
    if (dateKey === null) return original.call(this);
    const left = columnLeft(dateKey);
    const top = allDayDate !== null ? ALL_DAY_TOP_PX : ALL_DAY_BOTTOM_PX + 4;
    const bottom = allDayDate !== null ? ALL_DAY_BOTTOM_PX : 1000;
    return { x: left, y: top, left, top, right: left + COLUMN_WIDTH_PX, bottom, width: COLUMN_WIDTH_PX, height: bottom - top, toJSON: () => ({}) } as DOMRect;
  };
  return () => {
    Element.prototype.getBoundingClientRect = original;
  };
}

/** dnd-kit vuelve a medir los destinos en un `requestAnimationFrame` (`MeasuringStrategy.Always`): sin dejar correr un frame de verdad entre paso y paso, la detección de colisiones sigue viendo la medición vieja. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

async function dragBy(chip: HTMLElement, from: { x: number; y: number }, to: { x: number; y: number }) {
  fireEvent.pointerDown(chip, { clientX: from.x, clientY: from.y, button: 0, isPrimary: true, pointerId: 1 });
  // Dos movimientos: el primero pasa el umbral de activación de 8px, el
  // segundo ya es el arrastre real con el destino final.
  await act(async () => {
    fireEvent.pointerMove(document, { clientX: from.x + 20, clientY: from.y, pointerId: 1 });
  });
  await settle();
  await act(async () => {
    fireEvent.pointerMove(document, { clientX: to.x, clientY: to.y, pointerId: 1 });
  });
  await settle();
  return async () => {
    await act(async () => {
      fireEvent.pointerUp(document, { clientX: to.x, clientY: to.y, pointerId: 1 });
    });
  };
}

describe("CalendarView — arrastrar a la fila de todo el día", () => {
  let restoreLayout: (() => void) | null = null;

  afterEach(() => {
    restoreLayout?.();
    restoreLayout = null;
  });

  const allDayTask: CalendarBlock = {
    id: "task-allday",
    type: "task",
    title: "Renovar el pasaporte",
    color: SAME_COLOR,
    allDay: true,
    start: "2026-08-05",
    end: "2026-08-06",
  };

  it("sin ningún arrastre en curso, la fila de todo el día no muestra destinos", () => {
    const { container } = render(
      <CalendarView format="cuatro-dias" anchorDate="2026-08-05" timezone={TZ} weekStartsOn={1} blocks={[allDayTask]} now={NOW} />,
    );
    expect(container.querySelectorAll("[data-all-day-drop]")).toHaveLength(0);
  });

  it("mueve una tarea de todo el día a otro día sin darle horario", async () => {
    restoreLayout = stubGridLayout("2026-08-05");
    const onMoveBlockToAllDay = vi.fn();
    const onMoveBlock = vi.fn();

    render(
      <CalendarView
        format="cuatro-dias"
        anchorDate="2026-08-05"
        timezone={TZ}
        weekStartsOn={1}
        blocks={[allDayTask]}
        now={NOW}
        onMoveBlock={onMoveBlock}
        onMoveBlockToAllDay={onMoveBlockToAllDay}
      />,
    );

    const chip = screen.getByRole("button", { name: "Renovar el pasaporte" });
    const drop = await dragBy(chip, { x: 100, y: 40 }, { x: 500, y: 40 });
    // El día destino se resalta mientras el gesto sigue vivo: sin esto, el
    // arrastre no diría a cuál de las columnas está apuntando.
    expect(document.querySelector('[data-all-day-drop="2026-08-07"]')?.className).toContain("border-info");
    await drop();

    expect(onMoveBlock).not.toHaveBeenCalled();
    expect(onMoveBlockToAllDay).toHaveBeenCalledTimes(1);
    expect(onMoveBlockToAllDay.mock.calls[0][0].id).toBe("task-allday");
    expect(onMoveBlockToAllDay.mock.calls[0][1]).toEqual({ startDate: "2026-08-07", endDate: "2026-08-08" });
  });

  it("a una tarea con horario soltada en la fila le saca la hora, sin pasar por la columna horaria", async () => {
    restoreLayout = stubGridLayout("2026-08-05");
    const onMoveBlockToAllDay = vi.fn();
    const onMoveBlock = vi.fn();
    const timed: CalendarBlock = {
      id: "task-timed",
      type: "task",
      title: "Llamar al banco",
      color: SAME_COLOR,
      allDay: false,
      start: "2026-08-05T10:00:00-03:00",
      end: "2026-08-05T11:00:00-03:00",
    };

    render(
      <CalendarView
        format="cuatro-dias"
        anchorDate="2026-08-05"
        timezone={TZ}
        weekStartsOn={1}
        blocks={[timed]}
        now={NOW}
        onMoveBlock={onMoveBlock}
        onMoveBlockToAllDay={onMoveBlockToAllDay}
      />,
    );

    // Un bloque de una hora mide 96px de alto: por área solaparía más con la
    // columna horaria que con los 26px de la fila de todo el día. Lo que
    // manda es dónde quedó el puntero.
    const chip = screen.getByRole("button", { name: "Llamar al banco" });
    const drop = await dragBy(chip, { x: 100, y: 300 }, { x: 500, y: 40 });
    await drop();

    expect(onMoveBlock).not.toHaveBeenCalled();
    expect(onMoveBlockToAllDay).toHaveBeenCalledTimes(1);
    expect(onMoveBlockToAllDay.mock.calls[0][1]).toEqual({ startDate: "2026-08-07", endDate: "2026-08-08" });
  });

  it("mientras se arrastra, la fila de todo el día ofrece un destino por cada día montado, aunque no haya nada de todo el día", async () => {
    restoreLayout = stubGridLayout("2026-08-05");
    const timed: CalendarBlock = {
      id: "task-timed",
      type: "task",
      title: "Llamar al banco",
      color: SAME_COLOR,
      allDay: false,
      start: "2026-08-05T10:00:00-03:00",
      end: "2026-08-05T11:00:00-03:00",
    };

    const { container } = render(
      <CalendarView format="cuatro-dias" anchorDate="2026-08-05" timezone={TZ} weekStartsOn={1} blocks={[timed]} now={NOW} />,
    );

    expect(container.querySelectorAll("[data-all-day-drop]")).toHaveLength(0);

    const chip = screen.getByRole("button", { name: "Llamar al banco" });
    const drop = await dragBy(chip, { x: 100, y: 300 }, { x: 500, y: 40 });
    const days = container.querySelectorAll("[data-all-day-drop]");
    expect(days.length).toBeGreaterThanOrEqual(4);
    expect(container.querySelector('[data-all-day-drop="2026-08-07"]')).not.toBeNull();
    await drop();

    // Terminado el gesto, la fila vacía vuelve a desaparecer.
    expect(container.querySelectorAll("[data-all-day-drop]")).toHaveLength(0);
  });
});
