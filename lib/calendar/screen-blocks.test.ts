import { describe, expect, it } from "vitest";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { CalendarEventInstance } from "./events";
import { eventToCalendarBlock, habitBlockId, habitToCalendarBlock, parseHabitBlockId, taskToCalendarBlock } from "./screen-blocks";

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
    });
  });

  it("una tarea sin ninguna fecha no se traduce a bloque", () => {
    expect(taskToCalendarBlock(task({}), "#0284C7")).toBeNull();
  });
});

describe("habitToCalendarBlock / habitBlockId", () => {
  it("arma un bloque con horario a partir de scheduled_time y duration_minutes", () => {
    const habit = { id: "habit-1", name: "Meditar", duration_minutes: 15 };
    const block = habitToCalendarBlock(habit, "2026-08-05", "11:00:00", "#22C55E", TZ);
    expect(block.id).toBe("habit-1::2026-08-05");
    expect(block.type).toBe("habit");
    expect(block.title).toBe("Meditar");
    expect(block.allDay).toBe(false);
    expect(block.start).toBe(new Date("2026-08-05T11:00:00-03:00").toISOString());
    expect(block.end).toBe(new Date("2026-08-05T11:15:00-03:00").toISOString());
  });

  it("parseHabitBlockId recupera el id del hábito de un id de bloque", () => {
    expect(parseHabitBlockId(habitBlockId("habit-1", "2026-08-05"))).toBe("habit-1");
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
    };
    expect(eventToCalendarBlock(event)).toEqual({
      id: "event-1",
      type: "event",
      title: "Reunión",
      color: "#039BE5",
      allDay: false,
      start: "2026-08-05T13:00:00-03:00",
      end: "2026-08-05T14:00:00-03:00",
    });
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
    };
    expect(eventToCalendarBlock(event).color).toBe("#6B7280");
  });
});
