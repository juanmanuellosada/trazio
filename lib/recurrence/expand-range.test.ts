import { describe, expect, it } from "vitest";
import { formatDate, type CalendarDate } from "@/lib/parser/dates";
import { expandRecurringTaskRange, type RecurringTaskForExpansion } from "./expand-range";

// Tarea 5.7 (bloques de vista previa de repeticiones futuras): "2026-08-03"
// es un lunes (mismo ancla que usa `series.test.ts`/`hoy-view.test.tsx` para
// otras fechas de esta misma semana de referencia).

function task(overrides: Partial<RecurringTaskForExpansion> = {}): RecurringTaskForExpansion {
  return {
    recurrence_rule: "FREQ=WEEKLY;BYDAY=MO",
    due_date: "2026-08-03",
    due_at: null,
    recurrence_ends_at: null,
    recurrence_count: null,
    ...overrides,
  };
}

function cd(y: number, m: number, d: number): CalendarDate {
  return { y, m, d };
}

describe("expandRecurringTaskRange", () => {
  it("regla semanal: los próximos lunes dentro del rango, sin la ocurrencia actual", () => {
    const dates = expandRecurringTaskRange(task(), cd(2026, 8, 1), cd(2026, 8, 24));
    expect(dates.map(formatDate)).toEqual(["2026-08-10", "2026-08-17", "2026-08-24"]);
  });

  it("regla de intervalo puro: cada 3 días desde la fecha actual de la tarea", () => {
    const t = task({ recurrence_rule: "FREQ=DAILY;INTERVAL=3", due_date: "2026-08-01" });
    const dates = expandRecurringTaskRange(t, cd(2026, 8, 1), cd(2026, 8, 10));
    expect(dates.map(formatDate)).toEqual(["2026-08-04", "2026-08-07", "2026-08-10"]);
  });

  it("corta en recurrence_ends_at aunque el rango visible siga después", () => {
    const t = task({ recurrence_ends_at: "2026-08-12T23:59:59.999Z" });
    const dates = expandRecurringTaskRange(t, cd(2026, 8, 1), cd(2026, 8, 31));
    expect(dates.map(formatDate)).toEqual(["2026-08-10"]);
  });

  it("corta en recurrence_count: como mucho esa cantidad de ocurrencias futuras", () => {
    const t = task({ recurrence_count: 1 });
    const dates = expandRecurringTaskRange(t, cd(2026, 8, 1), cd(2026, 8, 31));
    expect(dates.map(formatDate)).toEqual(["2026-08-10"]);
  });

  it("recurrence_count nulo: sin límite, devuelve todas las que entren en el rango", () => {
    const t = task({ recurrence_count: null });
    const dates = expandRecurringTaskRange(t, cd(2026, 8, 1), cd(2026, 8, 24));
    expect(dates).toHaveLength(3);
  });

  it("una tarea sin recurrence_rule no debería llegar acá, pero si llega devuelve vacío en vez de explotar", () => {
    const t = task({ recurrence_rule: null });
    expect(expandRecurringTaskRange(t, cd(2026, 8, 1), cd(2026, 8, 24))).toEqual([]);
  });

  it("una tarea sin ninguna fecha propia (due_date/due_at) tampoco explota: devuelve vacío", () => {
    const t = task({ due_date: null, due_at: null });
    expect(expandRecurringTaskRange(t, cd(2026, 8, 1), cd(2026, 8, 24))).toEqual([]);
  });

  it("el rango visible termina antes de la fecha actual de la tarea: no hay ninguna ocurrencia futura que mostrar", () => {
    const dates = expandRecurringTaskRange(task(), cd(2026, 7, 1), cd(2026, 7, 31));
    expect(dates).toEqual([]);
  });
});
