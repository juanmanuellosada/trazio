// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HoySequenceEntry, HoySequenceEvent } from "@/lib/tasks/hoy-sequence";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { HoyTodaySequence } from "./hoy-today-sequence";

/**
 * Marca de "ahora" en la vista Hoy, modo lista (pedido del dueño, "no sé qué
 * hora es actualmente. Para tener referencia"). `TaskRow` real trae cuatro
 * mutaciones de tarea y varios hooks ajenos a lo que se prueba acá (misma
 * decisión que toma `hoy-view.test.tsx` con `Board`): se mockea por un `<li>`
 * mínimo, así estas pruebas quedan enfocadas en dónde cae la marca y cuándo
 * se actualiza sola.
 */
vi.mock("./task-row", () => ({
  TaskRow: ({ task }: { task: TaskRowData }) => <li>{task.title}</li>,
}));

const TZ = "America/Argentina/Buenos_Aires";
const TODAY = "2026-08-05";
const OTHER_DAY = "2026-08-06";

type TestEvent = HoySequenceEvent & { id: string; title: string };

function task(overrides: Partial<TaskRowData> = {}): TaskRowData {
  return {
    id: "task-1",
    project_id: "project-1",
    section_id: null,
    parent_id: null,
    title: "Tarea",
    priority: 4,
    due_date: null,
    due_at: null,
    duration_minutes: null,
    deadline: null,
    completed_at: null,
    position: 1000,
    labels: [],
    ...overrides,
  };
}

function taskEntry(overrides: Partial<TaskRowData> = {}): HoySequenceEntry<TaskRowData, TestEvent> {
  return { kind: "task", task: task(overrides) };
}

function eventEntry(overrides: Partial<TestEvent> & { id: string; title: string }): HoySequenceEntry<TaskRowData, TestEvent> {
  return { kind: "event", event: { allDay: false, start: "2026-08-05T12:00:00.000Z", ...overrides } };
}

function renderEventRow(event: TestEvent) {
  return <li key={event.id}>{event.title}</li>;
}

function renderSequence(
  sequence: HoySequenceEntry<TaskRowData, TestEvent>[],
  now: Date,
  overrides: { todayDate?: string; timeFormat?: 12 | 24 } = {},
) {
  return render(
    <HoyTodaySequence
      mixedSequence={sequence}
      renderEventRow={renderEventRow}
      tasks={[]}
      todaySequenceTaskIds={[]}
      timezone={TZ}
      timeFormat={overrides.timeFormat ?? 24}
      todayDate={overrides.todayDate ?? TODAY}
      now={now}
    />,
  );
}

function markerText(container: HTMLElement): string | null {
  return container.querySelector(".text-destructive")?.textContent ?? null;
}

describe("HoyTodaySequence — posición cronológica de la marca de \"ahora\"", () => {
  it("cae entre el ítem anterior y el siguiente, con la hora en el formato de preferencia (24h)", () => {
    const { container } = renderSequence(
      [
        taskEntry({ id: "before", title: "Pagar el gas", due_at: "2026-08-05T12:00:00.000Z" }), // 09:00 BA
        taskEntry({ id: "after", title: "Cambiar las sábanas", due_at: "2026-08-05T19:30:00.000Z" }), // 16:30 BA
      ],
      new Date("2026-08-05T15:37:00.000Z"), // 12:37 BA
    );

    const text = container.textContent ?? "";
    expect(text.indexOf("Pagar el gas")).toBeLessThan(text.indexOf("12:37"));
    expect(text.indexOf("12:37")).toBeLessThan(text.indexOf("Cambiar las sábanas"));
  });

  it("respeta el formato de 12h de preferencia", () => {
    const { container } = renderSequence(
      [taskEntry({ id: "after", title: "Cambiar las sábanas", due_at: "2026-08-05T19:30:00.000Z" })],
      new Date("2026-08-05T15:37:00.000Z"), // 12:37 BA
      { timeFormat: 12 },
    );

    expect(markerText(container)).toContain("12:37 p.m.");
  });

  it("todo ya pasó: la marca queda al final del tramo con hora, antes del tramo sin hora", () => {
    const { container } = renderSequence(
      [
        taskEntry({ id: "earlier", title: "Reunión de equipo", due_at: "2026-08-05T12:00:00.000Z" }), // 09:00 BA
        taskEntry({ id: "undated", title: "Llamar al contador" }),
      ],
      new Date("2026-08-05T23:00:00.000Z"), // 20:00 BA
    );

    const text = container.textContent ?? "";
    expect(text.indexOf("Reunión de equipo")).toBeLessThan(text.indexOf("20:00"));
    expect(text.indexOf("20:00")).toBeLessThan(text.indexOf("Llamar al contador"));
  });

  it("nada empezó todavía: la marca queda al principio del tramo con hora, después de un evento de todo el día", () => {
    const { container } = renderSequence(
      [
        eventEntry({ id: "holiday", title: "Feriado", allDay: true, start: "2026-08-05" }),
        taskEntry({ id: "later", title: "Gimnasio", due_at: "2026-08-05T22:00:00.000Z" }), // 19:00 BA
      ],
      new Date("2026-08-05T12:00:00.000Z"), // 09:00 BA
    );

    const text = container.textContent ?? "";
    expect(text.indexOf("Feriado")).toBeLessThan(text.indexOf("09:00"));
    expect(text.indexOf("09:00")).toBeLessThan(text.indexOf("Gimnasio"));
  });
});

describe("HoyTodaySequence — casos borde", () => {
  it("ningún ítem con hora: no se muestra ninguna marca", () => {
    const { container } = renderSequence(
      [eventEntry({ id: "holiday", title: "Feriado", allDay: true, start: "2026-08-05" }), taskEntry({ id: "undated", title: "Sin hora" })],
      new Date("2026-08-05T15:00:00.000Z"),
    );

    expect(container.querySelector(".text-destructive")).not.toBeInTheDocument();
  });

  it("secuencia vacía: no rompe ni muestra marca", () => {
    const { container } = renderSequence([], new Date("2026-08-05T15:00:00.000Z"));
    expect(container.querySelector(".text-destructive")).not.toBeInTheDocument();
  });

  it("el día de 'ahora' ya no es todayDate: no se muestra la marca (red de seguridad)", () => {
    const { container } = renderSequence(
      [taskEntry({ id: "t1", title: "Tarea", due_at: "2026-08-05T12:00:00.000Z" })],
      new Date("2026-08-05T15:00:00.000Z"),
      { todayDate: OTHER_DAY },
    );

    expect(container.querySelector(".text-destructive")).not.toBeInTheDocument();
  });
});

describe("HoyTodaySequence — accesibilidad", () => {
  it("es un <li> real con texto para lectores de pantalla y adornos visuales ocultos", () => {
    const { container } = renderSequence(
      [taskEntry({ id: "t1", title: "Tarea", due_at: "2026-08-05T12:00:00.000Z" })],
      new Date("2026-08-05T15:00:00.000Z"),
    );

    const marker = container.querySelector(".text-destructive")!.closest("li");
    expect(marker?.tagName).toBe("LI");
    expect(marker?.querySelector(".sr-only")?.textContent).toBe("Hora actual: ");
    const decorations = marker!.querySelectorAll("[aria-hidden]");
    expect(decorations.length).toBeGreaterThan(0);
  });
});

describe("HoyTodaySequence — se actualiza sola, sin recargar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cada minuto avanza el reloj interno, y la marca se mueve de posición cuando cruza un ítem", () => {
    const { container } = renderSequence(
      [
        taskEntry({ id: "at-1200", title: "Reunión de equipo", due_at: "2026-08-05T12:00:00.000Z" }), // 09:00 BA
        taskEntry({ id: "at-1210", title: "Pagar el gas", due_at: "2026-08-05T12:10:00.000Z" }), // 09:10 BA
      ],
      new Date("2026-08-05T12:05:00.000Z"), // 09:05 BA — entre las dos.
    );

    let text = container.textContent ?? "";
    expect(text.indexOf("Reunión de equipo")).toBeLessThan(text.indexOf("09:05"));
    expect(text.indexOf("09:05")).toBeLessThan(text.indexOf("Pagar el gas"));

    act(() => {
      // `advanceTimersByTime` mueve el reloj *desde* lo que ya esté seteado:
      // 12:14 + 60_000ms de avance = 12:15Z (09:15 BA), pasó las dos.
      vi.setSystemTime(new Date("2026-08-05T12:14:00.000Z"));
      vi.advanceTimersByTime(60_000);
    });

    text = container.textContent ?? "";
    expect(text.indexOf("Pagar el gas")).toBeLessThan(text.indexOf("09:15"));
  });
});
