import { describe, expect, it } from "vitest";
import { planNextOccurrence, type RecurringTaskFields } from "./series";

const TZ = "America/Argentina/Buenos_Aires";

function baseTask(overrides: Partial<RecurringTaskFields> = {}): RecurringTaskFields {
  return {
    recurrence_rule: "FREQ=DAILY;INTERVAL=3",
    recurrence_ends_at: null,
    recurrence_count: null,
    due_date: "2026-07-08",
    due_at: null,
    recurrence_anchor: null,
    ...overrides,
  };
}

describe("planNextOccurrence — fin de serie (requirement \"Fin de la serie recurrente\")", () => {
  it("recurrence_ends_at ya pasado: no genera ninguna instancia", () => {
    const task = baseTask({ recurrence_ends_at: "2026-07-01T00:00:00.000Z" });
    const plan = planNextOccurrence(task, new Date("2026-07-10T12:00:00.000Z"), { y: 2026, m: 7, d: 10 }, TZ);
    expect(plan).toBeNull();
  });

  it("recurrence_ends_at en el futuro: sí genera la siguiente instancia", () => {
    const task = baseTask({ recurrence_ends_at: "2026-12-01T00:00:00.000Z" });
    const plan = planNextOccurrence(task, new Date("2026-07-10T12:00:00.000Z"), { y: 2026, m: 7, d: 10 }, TZ);
    expect(plan).not.toBeNull();
  });

  it("recurrence_count agotado (0): no genera ninguna instancia", () => {
    const task = baseTask({ recurrence_count: 0 });
    const plan = planNextOccurrence(task, new Date("2026-07-10T12:00:00.000Z"), { y: 2026, m: 7, d: 10 }, TZ);
    expect(plan).toBeNull();
  });

  it("recurrence_count con repeticiones restantes: genera la instancia y decrementa el contador", () => {
    const task = baseTask({ recurrence_count: 3 });
    const plan = planNextOccurrence(task, new Date("2026-07-10T12:00:00.000Z"), { y: 2026, m: 7, d: 10 }, TZ);
    expect(plan?.recurrence_count).toBe(2);
  });

  it("recurrence_count nulo: sin límite, la siguiente instancia también queda sin límite", () => {
    const task = baseTask({ recurrence_count: null });
    const plan = planNextOccurrence(task, new Date("2026-07-10T12:00:00.000Z"), { y: 2026, m: 7, d: 10 }, TZ);
    expect(plan?.recurrence_count).toBeNull();
  });
});

describe("planNextOccurrence — hora de la siguiente instancia", () => {
  it("la tarea original no tenía hora (due_date): la siguiente tampoco la tiene", () => {
    const task = baseTask({ due_date: "2026-07-08", due_at: null });
    const plan = planNextOccurrence(task, new Date("2026-07-10T12:00:00.000Z"), { y: 2026, m: 7, d: 10 }, TZ);
    expect(plan?.due_at).toBeNull();
    expect(plan?.due_date).toBe("2026-07-13");
  });

  it("la tarea original tenía due_at: la siguiente conserva la misma hora del día (D17)", () => {
    // 2026-07-08 09:00 en America/Argentina/Buenos_Aires (UTC-3) = 12:00 UTC.
    const task = baseTask({ due_date: null, due_at: "2026-07-08T12:00:00.000Z" });
    const plan = planNextOccurrence(task, new Date("2026-07-10T12:00:00.000Z"), { y: 2026, m: 7, d: 10 }, TZ);
    expect(plan?.due_date).toBeNull();
    expect(plan?.due_at).toBe(new Date("2026-07-13T12:00:00.000Z").toISOString());
  });

  it("la tarea original no tenía ninguna fecha: la siguiente instancia igual recibe due_date", () => {
    const task = baseTask({ due_date: null, due_at: null });
    const plan = planNextOccurrence(task, new Date("2026-07-10T12:00:00.000Z"), { y: 2026, m: 7, d: 10 }, TZ);
    expect(plan?.due_date).toBe("2026-07-13");
    expect(plan?.due_at).toBeNull();
  });
});

/**
 * `repeticion-configurable` (D-A): con `recurrence_anchor` explícito, gana
 * sobre la forma de la regla — habilita combinaciones que antes eran
 * imposibles, porque el ancla y la forma de la regla estaban acopladas
 * (`lib/recurrence/anchor.ts`, `deriveAnchor`). Nadie las había probado.
 */
describe("planNextOccurrence — ancla elegida explícitamente (repeticion-configurable, D-A)", () => {
  it('"cada 3 días" con ancla elegida "vencimiento": cuenta desde el vencimiento, no desde el completado', () => {
    // Sin elegir nada, un intervalo puro cuenta desde el completado (día 13,
    // ver el describe de arriba). Con "due" elegido explícito, cuenta desde
    // el vencimiento original (día 8): la siguiente instancia es el día 11.
    const task = baseTask({ recurrence_rule: "FREQ=DAILY;INTERVAL=3", due_date: "2026-07-08", recurrence_anchor: "due" });
    const plan = planNextOccurrence(task, new Date("2026-07-10T12:00:00.000Z"), { y: 2026, m: 7, d: 10 }, TZ);
    expect(plan?.due_date).toBe("2026-07-11");
  });

  it('"cada lunes" con ancla elegida "completado": cuenta desde el completado, no desde el vencimiento', () => {
    // Con intervalo 1, "cada lunes" cae el mismo lunes sin importar el
    // ancla (todos los lunes están incluidos igual): por eso, para que el
    // ancla se note en el resultado, este caso usa intervalo 2 ("cada 2
    // semanas los lunes"), donde la semana de referencia sí cambia qué
    // lunes entran en la serie. Vencía el lunes 2026-06-29 y se completa el
    // miércoles 2026-07-08 (semana siguiente): sin elegir nada, la serie
    // sigue la paridad de semana del vencimiento (29/6, 13/7, 27/7, …) y la
    // siguiente sería el 13/7; con "completion" elegido, la serie sigue la
    // paridad de semana del completado (6/7, 20/7, …) y la siguiente es el
    // 20/7 — un resultado distinto, prueba de que el ancla elegida gana.
    const task = baseTask({
      recurrence_rule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO",
      due_date: "2026-06-29",
      recurrence_anchor: "completion",
    });
    const plan = planNextOccurrence(task, new Date("2026-07-08T12:00:00.000Z"), { y: 2026, m: 7, d: 8 }, TZ);
    expect(plan?.due_date).toBe("2026-07-20");

    const withoutAnchor = baseTask({ recurrence_rule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", due_date: "2026-06-29" });
    const planWithoutAnchor = planNextOccurrence(withoutAnchor, new Date("2026-07-08T12:00:00.000Z"), { y: 2026, m: 7, d: 8 }, TZ);
    expect(planWithoutAnchor?.due_date).toBe("2026-07-13");
  });
});
