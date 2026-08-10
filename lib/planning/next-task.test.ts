import { describe, expect, it } from "vitest";
import { nextAvailableGap, selectNextTask, type NextTaskCandidate } from "./next-task";

const D = (hhmm: string) => new Date(`2026-08-09T${hhmm}:00.000Z`);

function candidate(overrides: Partial<NextTaskCandidate>): NextTaskCandidate {
  return {
    id: "id",
    durationMinutes: 30,
    dueDate: "2026-08-09",
    overdue: false,
    deadline: null,
    priority: 4,
    position: 0,
    ...overrides,
  };
}

describe("nextAvailableGap", () => {
  it("sin huecos: null", () => {
    expect(nextAvailableGap([])).toBeNull();
  });

  it("un hueco de 5 minutos o más: se toma", () => {
    expect(nextAvailableGap([{ start: D("13:00"), end: D("13:05") }])).toEqual({ start: D("13:00"), end: D("13:05") });
  });

  it("un hueco de menos de 5 minutos: null, como si no hubiera ninguno", () => {
    expect(nextAvailableGap([{ start: D("13:00"), end: D("13:03") }])).toBeNull();
  });
});

describe("selectNextTask", () => {
  it("la duración es un requisito duro: una tarea que no entra nunca se propone", () => {
    const candidates = [candidate({ id: "a", durationMinutes: 45 })];
    expect(selectNextTask(candidates, 30)).toBeNull();
  });

  it("sin candidatas: null", () => {
    expect(selectNextTask([], 30)).toBeNull();
  });

  it("una tarea sin duración nunca es candidata", () => {
    const candidates = [candidate({ id: "a", durationMinutes: null })];
    expect(selectNextTask(candidates, 30)).toBeNull();
  });

  it("una atrasada gana sobre una que vence hoy", () => {
    const candidates = [
      candidate({ id: "hoy", overdue: false, durationMinutes: 20 }),
      candidate({ id: "atrasada", overdue: true, durationMinutes: 20 }),
    ];
    expect(selectNextTask(candidates, 30)?.id).toBe("atrasada");
  });

  it("entre atrasadas, la más vencida (fecha más antigua) primero", () => {
    const candidates = [
      candidate({ id: "reciente", overdue: true, dueDate: "2026-08-08" }),
      candidate({ id: "vieja", overdue: true, dueDate: "2026-08-01" }),
    ];
    expect(selectNextTask(candidates, 30)?.id).toBe("vieja");
  });

  it("la fecha límite pesa más que la prioridad", () => {
    const candidates = [
      candidate({ id: "urgente-sin-deadline", priority: 1, deadline: null }),
      candidate({ id: "baja-con-deadline", priority: 4, deadline: "2026-08-10" }),
    ];
    expect(selectNextTask(candidates, 30)?.id).toBe("baja-con-deadline");
  });

  it("sin deadline se ordena después de cualquiera que sí la tenga", () => {
    const candidates = [
      candidate({ id: "sin-deadline", deadline: null }),
      candidate({ id: "con-deadline", deadline: "2026-12-31" }),
    ];
    expect(selectNextTask(candidates, 30)?.id).toBe("con-deadline");
  });

  it("empatadas en deadline: desempata por prioridad (menor número, más urgente)", () => {
    const candidates = [
      candidate({ id: "baja", deadline: "2026-08-10", priority: 4 }),
      candidate({ id: "urgente", deadline: "2026-08-10", priority: 1 }),
    ];
    expect(selectNextTask(candidates, 30)?.id).toBe("urgente");
  });

  it("empatadas en prioridad: desempata por position ascendente", () => {
    const candidates = [
      candidate({ id: "segunda", priority: 2, position: 5 }),
      candidate({ id: "primera", priority: 2, position: 1 }),
    ];
    expect(selectNextTask(candidates, 30)?.id).toBe("primera");
  });
});
