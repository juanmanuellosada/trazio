import { describe, expect, it } from "vitest";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { contrastRatio, MIN_PROJECT_COLOR_CONTRAST, PROJECT_SURFACE_HEX } from "@/lib/validation/colors";
import type { CalendarEventInstance } from "./events";
import {
  eventBlockId,
  eventColorForTheme,
  eventToCalendarBlock,
  habitBlockId,
  habitToCalendarBlock,
  parseHabitBlockId,
  taskRecurrencePreviewBlocks,
  taskToCalendarBlock,
} from "./screen-blocks";

const TZ = "America/Argentina/Buenos_Aires";

function task(overrides: Partial<TaskRow>): TaskRow {
  return {
    id: "task-1",
    project_id: "project-1",
    section_id: null,
    parent_id: null,
    title: "Escribir el informe",
    priority: 2,
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

describe("taskToCalendarBlock", () => {
  it("una tarea con due_at arma un bloque con horario, usando duration_minutes", () => {
    const block = taskToCalendarBlock(task({ due_at: "2026-08-05T10:00:00-03:00", duration_minutes: 45 }), "#0284C7");
    expect(block).toEqual({
      id: "task-1",
      type: "task",
      title: "Escribir el informe",
      color: "#0284C7",
      allDay: false,
      start: "2026-08-05T10:00:00-03:00",
      end: new Date("2026-08-05T10:45:00-03:00").toISOString(),
      completed: false,
      labels: [],
    });
  });

  it("una tarea con due_at pero sin duration_minutes usa 30 minutos por defecto", () => {
    const block = taskToCalendarBlock(task({ due_at: "2026-08-05T10:00:00-03:00" }), "#0284C7");
    expect(block?.end).toBe(new Date("2026-08-05T10:30:00-03:00").toISOString());
  });

  it("una tarea solo con due_date arma un bloque de todo el día, con end exclusivo (día siguiente)", () => {
    const block = taskToCalendarBlock(task({ due_date: "2026-08-05" }), "#0284C7");
    expect(block).toEqual({
      id: "task-1",
      type: "task",
      title: "Escribir el informe",
      color: "#0284C7",
      allDay: true,
      start: "2026-08-05",
      end: "2026-08-06",
      completed: false,
      labels: [],
    });
  });

  it("una tarea sin ninguna fecha no se traduce a bloque", () => {
    expect(taskToCalendarBlock(task({}), "#0284C7")).toBeNull();
  });

  it("una tarea completada arma el bloque con completed: true", () => {
    const block = taskToCalendarBlock(task({ due_at: "2026-08-05T10:00:00-03:00", completed_at: "2026-08-05T09:00:00-03:00" }), "#0284C7");
    expect(block?.completed).toBe(true);
  });

  it("las etiquetas de la tarea viajan al bloque tal cual", () => {
    const labels = [{ id: "label-1", name: "Urgente", color: "amarillo" }];
    const block = taskToCalendarBlock(task({ due_at: "2026-08-05T10:00:00-03:00", labels }), "#0284C7");
    expect(block?.labels).toEqual(labels);
  });

  it("el nombre del proyecto es opcional: sin pasarlo, el bloque no lo tiene", () => {
    const withName = taskToCalendarBlock(task({ due_at: "2026-08-05T10:00:00-03:00" }), "#0284C7", "Trabajo");
    expect(withName?.projectName).toBe("Trabajo");
    const withoutName = taskToCalendarBlock(task({ due_at: "2026-08-05T10:00:00-03:00" }), "#0284C7");
    expect(withoutName?.projectName).toBeUndefined();
  });
});

describe("habitToCalendarBlock / habitBlockId", () => {
  it("arma un bloque con horario a partir de scheduled_time y duration_minutes", () => {
    const habit = { id: "habit-1", name: "Meditar", duration_minutes: 15, completed_today: false };
    const block = habitToCalendarBlock(habit, "2026-08-05", "11:00:00", "#22C55E", TZ);
    expect(block.id).toBe("habit-1::2026-08-05");
    expect(block.type).toBe("habit");
    expect(block.title).toBe("Meditar");
    expect(block.allDay).toBe(false);
    expect(block.start).toBe(new Date("2026-08-05T11:00:00-03:00").toISOString());
    expect(block.end).toBe(new Date("2026-08-05T11:15:00-03:00").toISOString());
    expect(block.completed).toBe(false);
  });

  it("un hábito cumplido hoy arma el bloque con completed: true", () => {
    const habit = { id: "habit-1", name: "Meditar", duration_minutes: 15, completed_today: true };
    const block = habitToCalendarBlock(habit, "2026-08-05", "11:00:00", "#22C55E", TZ);
    expect(block.completed).toBe(true);
  });

  it("parseHabitBlockId recupera el id del hábito de un id de bloque", () => {
    expect(parseHabitBlockId(habitBlockId("habit-1", "2026-08-05"))).toBe("habit-1");
  });
});

describe("eventColorForTheme (tarea 3.3, D-B)", () => {
  it("un color que ya tiene contraste suficiente en el tema se devuelve sin tocar", () => {
    // Azul saturado: buen contraste contra las dos superficies.
    expect(eventColorForTheme("#0B5FFF", "light")).toBe("#0B5FFF");
    expect(eventColorForTheme("#0B5FFF", "dark")).toBe("#0B5FFF");
  });

  it("un color demasiado claro para el tema claro se oscurece hasta alcanzar el piso de contraste", () => {
    const adjusted = eventColorForTheme("#FBD75B", "light"); // amarillo banana de Google
    expect(adjusted).not.toBe("#FBD75B");
    expect(contrastRatio(adjusted, PROJECT_SURFACE_HEX.light)).toBeGreaterThanOrEqual(MIN_PROJECT_COLOR_CONTRAST);
  });

  it("un color demasiado oscuro para el tema oscuro se aclara hasta alcanzar el piso de contraste", () => {
    const adjusted = eventColorForTheme("#1B4332", "dark"); // verde muy oscuro
    expect(adjusted).not.toBe("#1B4332");
    expect(contrastRatio(adjusted, PROJECT_SURFACE_HEX.dark)).toBeGreaterThanOrEqual(MIN_PROJECT_COLOR_CONTRAST);
  });

  it("un hex inválido se devuelve sin tocar", () => {
    expect(eventColorForTheme("not-a-color", "dark")).toBe("not-a-color");
  });
});

describe("eventToCalendarBlock", () => {
  it("usa el color del calendario de origen cuando está presente", () => {
    const event: CalendarEventInstance = {
      id: "event-1",
      calendarId: "cal-1",
      calendarColor: "#039BE5",
      title: "Reunión",
      description: null,
      location: null,
      allDay: false,
      start: "2026-08-05T13:00:00-03:00",
      end: "2026-08-05T14:00:00-03:00",
      timeZone: TZ,
      isRecurring: false,
      recurringEventId: null,
      originalStartTime: null,
      htmlLink: null,
    };
    expect(eventToCalendarBlock(event)).toEqual({
      id: "cal-1::event-1",
      type: "event",
      title: "Reunión",
      color: "#039BE5",
      allDay: false,
      start: "2026-08-05T13:00:00-03:00",
      end: "2026-08-05T14:00:00-03:00",
    });
  });

  it("dos eventos de calendarios distintos con el mismo id crudo de Google arman bloques con id distinto (defecto real: Google solo garantiza unicidad DENTRO de un calendario)", () => {
    const base = {
      id: "evt-1",
      calendarColor: null,
      title: "Reunión",
      description: null,
      location: null,
      allDay: false,
      start: "2026-08-05T13:00:00-03:00",
      end: "2026-08-05T14:00:00-03:00",
      timeZone: TZ,
      isRecurring: false,
      recurringEventId: null,
      originalStartTime: null,
      htmlLink: null,
    };
    const fromCalendarA: CalendarEventInstance = { ...base, calendarId: "calendar-a", title: "Reunión Personal" };
    const fromCalendarB: CalendarEventInstance = { ...base, calendarId: "calendar-b", title: "Standup Trabajo" };

    const blockA = eventToCalendarBlock(fromCalendarA);
    const blockB = eventToCalendarBlock(fromCalendarB);

    expect(blockA.id).not.toBe(blockB.id);
    expect(blockA.id).toBe(eventBlockId("calendar-a", "evt-1"));
    expect(blockB.id).toBe(eventBlockId("calendar-b", "evt-1"));
  });

  it("cae al color de respaldo cuando el evento no trae color de calendario", () => {
    const event: CalendarEventInstance = {
      id: "event-2",
      calendarId: "cal-1",
      calendarColor: null,
      title: "Feriado",
      description: null,
      location: null,
      allDay: true,
      start: "2026-08-05",
      end: "2026-08-06",
      timeZone: null,
      isRecurring: false,
      recurringEventId: null,
      originalStartTime: null,
      htmlLink: null,
    };
    expect(eventToCalendarBlock(event).color).toBe("#6B7280");
  });
});

describe("taskRecurrencePreviewBlocks (tarea 5.7: vista previa de repeticiones futuras)", () => {
  it("una tarea con due_at conserva la misma hora del día en cada ocurrencia futura", () => {
    const task = { id: "task-1", title: "Regar las plantas", due_at: "2026-08-03T11:00:00-03:00", duration_minutes: 20 };
    const blocks = taskRecurrencePreviewBlocks(task, [{ y: 2026, m: 8, d: 10 }, { y: 2026, m: 8, d: 17 }], "#22C55E", TZ);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      id: "task-1::preview::2026-08-10",
      type: "task",
      title: "Regar las plantas",
      color: "#22C55E",
      allDay: false,
      start: new Date("2026-08-10T11:00:00-03:00").toISOString(),
      end: new Date("2026-08-10T11:20:00-03:00").toISOString(),
      isPreview: true,
    });
  });

  it("sin duration_minutes propia, usa 30 minutos por defecto (mismo default que taskToCalendarBlock)", () => {
    const task = { id: "task-1", title: "Regar las plantas", due_at: "2026-08-03T11:00:00-03:00", duration_minutes: null };
    const [block] = taskRecurrencePreviewBlocks(task, [{ y: 2026, m: 8, d: 10 }], "#22C55E", TZ);
    expect(block?.end).toBe(new Date("2026-08-10T11:30:00-03:00").toISOString());
  });

  it("una tarea sin due_at (solo due_date) arma bloques de todo el día, con end exclusivo", () => {
    const task = { id: "task-2", title: "Pagar alquiler", due_at: null, duration_minutes: null };
    const [block] = taskRecurrencePreviewBlocks(task, [{ y: 2026, m: 9, d: 1 }], "#0284C7", TZ);
    expect(block).toEqual({
      id: "task-2::preview::2026-09-01",
      type: "task",
      title: "Pagar alquiler",
      color: "#0284C7",
      allDay: true,
      start: "2026-09-01",
      end: "2026-09-02",
      isPreview: true,
    });
  });

  it("sin ocurrencias, no arma ningún bloque", () => {
    const task = { id: "task-1", title: "Regar las plantas", due_at: null, duration_minutes: null };
    expect(taskRecurrencePreviewBlocks(task, [], "#22C55E", TZ)).toEqual([]);
  });
});
