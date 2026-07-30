import { describe, expect, it } from "vitest";
import { isTaskOverdue, taskDueDay } from "@/lib/dates/today";
import {
  UPCOMING_WINDOW_DEFAULT_DAYS,
  UPCOMING_WINDOW_MAX_DAYS,
  UPCOMING_WINDOW_MIN_DAYS,
  clampWindowDays,
  compareUpcomingTasks,
  upcomingCandidatesFilter,
} from "./upcoming-filter";

const BA = "America/Argentina/Buenos_Aires";

describe("UPCOMING_WINDOW_DEFAULT_DAYS (D-J: 7 días por defecto)", () => {
  it("el default es 7", () => {
    expect(UPCOMING_WINDOW_DEFAULT_DAYS).toBe(7);
  });
});

describe("clampWindowDays (requirement «Ventana configurable, con 7 días por defecto»)", () => {
  it("un valor dentro del rango no se toca", () => {
    expect(clampWindowDays(30)).toBe(30);
  });

  it("por debajo de una semana se sube al mínimo", () => {
    expect(clampWindowDays(1)).toBe(UPCOMING_WINDOW_MIN_DAYS);
  });

  it("por encima de tres meses se baja al máximo", () => {
    expect(clampWindowDays(365)).toBe(UPCOMING_WINDOW_MAX_DAYS);
  });
});

describe("upcomingCandidatesFilter — borde de fin de mes", () => {
  it("una ventana de 7 días que empieza el 28/07 termina el 03/08, cruzando de mes", () => {
    // "hoy" = 28/07 en BA (2026-07-28T15:00Z = 12:00 en BA).
    const now = new Date("2026-07-28T15:00:00.000Z");
    const filter = upcomingCandidatesFilter(now, BA, 7);
    // 28/07 + 6 días = 03/08.
    expect(filter).toContain("due_date.lte.2026-08-03");
  });

  it("ventana por defecto (7 días) desde un 1° de mes cualquiera", () => {
    const now = new Date("2026-09-01T15:00:00.000Z"); // 1° de septiembre en BA
    const filter = upcomingCandidatesFilter(now, BA, UPCOMING_WINDOW_DEFAULT_DAYS);
    expect(filter).toContain("due_date.lte.2026-09-07");
  });
});

describe("compareUpcomingTasks — orden (D25/opciones-de-vista, ventana de varios días)", () => {
  const priority4 = 4;

  it("primero el día calendario, sin importar hora: un día3 sin hora va antes que un día5 con hora", () => {
    const dia3SinHora = { due_date: "2026-08-03", due_at: null, priority: priority4 };
    const dia5ConHora = { due_date: null, due_at: "2026-08-05T09:00:00.000Z", priority: priority4 };
    expect(compareUpcomingTasks(dia3SinHora, dia5ConHora, BA)).toBeLessThan(0);
    expect(compareUpcomingTasks(dia5ConHora, dia3SinHora, BA)).toBeGreaterThan(0);
  });

  it("mismo día: con hora antes que sin hora", () => {
    const conHora = { due_date: null, due_at: "2026-08-03T23:00:00.000Z", priority: priority4 };
    const sinHora = { due_date: "2026-08-03", due_at: null, priority: priority4 };
    expect(compareUpcomingTasks(conHora, sinHora, BA)).toBeLessThan(0);
  });

  it("mismo día y misma hora: desempata por prioridad descendente", () => {
    const urgente = { due_date: "2026-08-03", due_at: null, priority: 1 };
    const baja = { due_date: "2026-08-03", due_at: null, priority: 4 };
    expect(compareUpcomingTasks(urgente, baja, BA)).toBeLessThan(0);
  });
});

describe("tarea de hoy con hora ya pasada: no es atrasada, cae en el grupo de hoy", () => {
  it("una tarea vencida hoy más temprano no se considera atrasada (E5, sin rollover)", () => {
    const now = new Date("2026-07-28T23:00:00.000Z"); // 20:00 en BA
    const dueAt = "2026-07-28T14:00:00.000Z"; // 11:00 en BA, ya pasó
    const task = { due_date: null, due_at: dueAt, completed_at: null };

    expect(isTaskOverdue(task, BA, now)).toBe(false);
    expect(taskDueDay(task, BA)).toBe("2026-07-28");
  });
});
