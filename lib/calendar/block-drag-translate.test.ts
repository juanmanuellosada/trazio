import { describe, expect, it } from "vitest";
import { eventAllDayChanges, eventDragChanges, eventUpdateInput, habitDragOverride, taskAllDayPatch, taskDragPatch } from "./block-drag-translate";

// Tarea 6.10: la traducción de cada tipo a su propia mutación (D-F,
// requirement de `assertAppliesOnDate` aparte, cubierto en
// `lib/habits/schedule-overrides.test.ts`).

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3, sin horario de verano.

describe("taskDragPatch (tarea 6.4, D9: due_date y due_at son excluyentes)", () => {
  it("vacía due_date y llena due_at con el instante del arrastre", () => {
    const start = new Date("2026-08-05T11:00:00-03:00");
    const end = new Date("2026-08-05T11:30:00-03:00");
    const patch = taskDragPatch({ start, end });
    expect(patch.due_date).toBeNull();
    expect(patch.due_at).toBe(start.toISOString());
  });

  it("exactamente una de las dos columnas queda con valor", () => {
    const patch = taskDragPatch({ start: new Date("2026-08-05T11:00:00-03:00"), end: new Date("2026-08-05T11:30:00-03:00") });
    const values = [patch.due_date, patch.due_at];
    expect(values.filter((v) => v !== null)).toHaveLength(1);
  });

  it("calcula duration_minutes del rango resultante", () => {
    const patch = taskDragPatch({ start: new Date("2026-08-05T11:00:00-03:00"), end: new Date("2026-08-05T12:15:00-03:00") });
    expect(patch.duration_minutes).toBe(75);
  });
});

describe("habitDragOverride (tarea 6.3/6.6)", () => {
  it("separa la fecha y la hora local del instante de arrastre", () => {
    const override = habitDragOverride(new Date("2026-08-05T09:00:00-03:00"), TZ);
    expect(override).toEqual({ date: "2026-08-05", scheduledTime: "09:00:00" });
  });

  it("usa la fecha del día que corresponde según la zona horaria del usuario, no UTC", () => {
    // 2026-08-05T23:30-03:00 es 2026-08-06T02:30Z: si se comparara contra
    // UTC, la fecha del override quedaría un día adelantada.
    const override = habitDragOverride(new Date("2026-08-05T23:30:00-03:00"), TZ);
    expect(override.date).toBe("2026-08-05");
  });
});

describe("eventDragChanges (tarea 6.3)", () => {
  it("conserva todos los campos del evento y solo reemplaza el rango", () => {
    const current = {
      calendarId: "primary",
      title: "Reunión",
      description: "Agenda",
      location: null,
      allDay: false,
      start: "2026-08-05T10:00:00-03:00",
      end: "2026-08-05T11:00:00-03:00",
      timeZone: TZ,
    };
    const result = { start: new Date("2026-08-05T14:00:00-03:00"), end: new Date("2026-08-05T15:00:00-03:00") };
    const changes = eventDragChanges(current, result);
    expect(changes).toEqual({ ...current, start: result.start.toISOString(), end: result.end.toISOString() });
  });

  it("un evento de todo el día no cambia con esta grilla horaria", () => {
    const current = {
      calendarId: "primary",
      title: "Feriado",
      description: null,
      location: null,
      allDay: true,
      start: "2026-08-05",
      end: "2026-08-06",
      timeZone: TZ,
    };
    const result = { start: new Date("2026-08-05T14:00:00-03:00"), end: new Date("2026-08-05T15:00:00-03:00") };
    expect(eventDragChanges(current, result)).toBe(current);
  });
});

describe("eventUpdateInput (tarea 8.4/D24: traducción del drag a EventInput)", () => {
  it("arma el EventInput campo a campo a partir del evento ya trasladado", () => {
    const changed = {
      calendarId: "primary",
      title: "Reunión",
      description: "Agenda",
      location: "Oficina",
      allDay: false,
      start: "2026-08-05T14:00:00.000Z",
      end: "2026-08-05T15:00:00.000Z",
      timeZone: TZ,
    };
    expect(eventUpdateInput(changed, "America/Argentina/Ushuaia")).toEqual({
      calendarId: "primary",
      title: "Reunión",
      description: "Agenda",
      location: "Oficina",
      allDay: false,
      start: "2026-08-05T14:00:00.000Z",
      end: "2026-08-05T15:00:00.000Z",
      timeZone: TZ,
    });
  });

  it("un evento de todo el día no trae timeZone propia: usa la de la pantalla", () => {
    const changed = {
      calendarId: "primary",
      title: "Feriado",
      description: null,
      location: null,
      allDay: true,
      start: "2026-08-05",
      end: "2026-08-06",
      timeZone: null,
    };
    expect(eventUpdateInput(changed, TZ).timeZone).toBe(TZ);
  });
});


// Reporte del dueño: "una tarea de todo el día no se puede arrastrar a otro
// día". El destino de todo el día es el espejo del de horario, y las dos
// columnas de la tarea siguen siendo excluyentes en los dos sentidos (D9).
describe("taskAllDayPatch", () => {
  it("vacía due_at y llena due_date con el día destino", () => {
    const patch = taskAllDayPatch({ startDate: "2026-08-09", endDate: "2026-08-10" });
    expect(patch).toEqual({ due_at: null, due_date: "2026-08-09" });
  });

  it("exactamente una de las dos columnas queda con valor", () => {
    const patch = taskAllDayPatch({ startDate: "2026-08-09", endDate: "2026-08-10" });
    expect([patch.due_date, patch.due_at].filter((v) => v !== null)).toHaveLength(1);
  });

  it("no toca duration_minutes: la duración estimada sobrevive a perder el horario", () => {
    expect(taskAllDayPatch({ startDate: "2026-08-09", endDate: "2026-08-10" })).not.toHaveProperty("duration_minutes");
  });
});

describe("eventAllDayChanges", () => {
  const base = {
    calendarId: "primary",
    title: "Feriado",
    description: null,
    location: null,
    start: "2026-08-05",
    end: "2026-08-06",
    timeZone: null,
  };

  it("mueve de fecha un evento que ya era de todo el día, conservando el resto de los campos", () => {
    const changes = eventAllDayChanges({ ...base, allDay: true }, { startDate: "2026-08-12", endDate: "2026-08-13" });
    expect(changes).toEqual({ ...base, allDay: true, start: "2026-08-12", end: "2026-08-13" });
  });

  it("a un evento con horario le saca la hora: pasa a allDay con dos fechas", () => {
    const timed = { ...base, allDay: false, start: "2026-08-05T10:00:00-03:00", end: "2026-08-05T11:00:00-03:00", timeZone: TZ };
    const changes = eventAllDayChanges(timed, { startDate: "2026-08-06", endDate: "2026-08-07" });
    expect(changes).toEqual({ ...timed, allDay: true, start: "2026-08-06", end: "2026-08-07" });
  });

  it("el EventInput resultante viaja con las dos fechas y allDay en true", () => {
    const changes = eventAllDayChanges({ ...base, allDay: true }, { startDate: "2026-08-12", endDate: "2026-08-13" });
    const input = eventUpdateInput(changes, TZ);
    expect(input.allDay).toBe(true);
    expect(input.start).toBe("2026-08-12");
    expect(input.end).toBe("2026-08-13");
  });
});
