import { describe, expect, it } from "vitest";
import {
  effectiveScheduledTime,
  habitAppliesOnDate,
  habitsDueTodayWithEffectiveTime,
  isHabitDueOn,
  isHabitDueToday,
} from "./today";

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3, sin horario de verano.

/**
 * Día ISO (1 lunes … 7 domingo) de una fecha calendario, calculado con
 * `Date` nativo — a propósito una vía distinta de la que usa `today.ts`
 * (`date-fns`), para no validar la implementación contra sí misma al armar
 * los `days_of_week` de las fixtures.
 */
function nativeIsoDow(dateIso: string): number {
  const jsDay = new Date(`${dateIso}T00:00:00Z`).getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

function habit(overrides: Partial<Parameters<typeof isHabitDueOn>[0]> = {}) {
  return {
    frequency_type: "daily" as const,
    days_of_week: null,
    created_at: "2026-01-01T00:00:00.000Z",
    is_archived: false,
    ...overrides,
  };
}

describe("habitAppliesOnDate / isHabitDueOn — los tres tipos de frecuencia (tarea 2.11)", () => {
  it("'todos los días' toca cualquier fecha", () => {
    const h = habit({ frequency_type: "daily" });
    expect(habitAppliesOnDate(h, "2026-07-31")).toBe(true);
    expect(habitAppliesOnDate(h, "2026-08-01")).toBe(true);
  });

  it("'días específicos' solo toca los días configurados, no los demás", () => {
    const dueDate = "2026-07-31";
    const notDueDate = "2026-08-01"; // día calendario siguiente: isodow distinto por construcción.
    const h = habit({ frequency_type: "specific_days", days_of_week: [nativeIsoDow(dueDate)] });

    expect(habitAppliesOnDate(h, dueDate)).toBe(true);
    expect(habitAppliesOnDate(h, notDueDate)).toBe(false);
  });

  it("'N veces por semana' toca cualquier día: la meta es semanal, no por día fijo", () => {
    const h = habit({ frequency_type: "times_per_week", days_of_week: null });
    expect(habitAppliesOnDate(h, "2026-07-31")).toBe(true);
    expect(habitAppliesOnDate(h, "2026-08-01")).toBe(true);
  });
});

describe("isHabitDueOn — un hábito no aparece antes de su creación, ni mientras está archivado", () => {
  it("un hábito creado hoy toca hoy, pero no el día anterior a su creación", () => {
    const h = habit({ frequency_type: "daily", created_at: "2026-07-31T12:00:00.000Z" });
    expect(isHabitDueOn(h, "2026-07-31", TZ)).toBe(true);
    expect(isHabitDueOn(h, "2026-07-30", TZ)).toBe(false);
  });

  it("un hábito archivado no toca ningún día, aunque su frecuencia lo indique", () => {
    const h = habit({ frequency_type: "daily", is_archived: true });
    expect(isHabitDueOn(h, "2026-07-31", TZ)).toBe(false);
  });

  it("\"hoy\" se resuelve en la zona horaria del hábito, no en UTC (D-G)", () => {
    // 2026-07-31T02:00:00Z son las 23:00 del 2026-07-30 en Buenos Aires (UTC-3):
    // todavía no es 31 ahí, aunque en UTC ya lo sea.
    const now = new Date("2026-07-31T02:00:00.000Z");
    const h = habit({ frequency_type: "daily", created_at: "2026-01-01T00:00:00.000Z" });
    expect(isHabitDueToday(h, TZ, now)).toBe(true); // toca el 30, que es "hoy" en BA.
    expect(isHabitDueOn(h, "2026-07-31", TZ)).toBe(true); // el 31 también toca (es 'daily'), solo cambia qué es "hoy".
  });
});

describe("effectiveScheduledTime y habitsDueTodayWithEffectiveTime — hora efectiva con override (tarea 2.11)", () => {
  it("sin override, la hora efectiva es la habitual del hábito", () => {
    expect(effectiveScheduledTime({ scheduled_time: "07:00" }, undefined)).toBe("07:00");
    expect(effectiveScheduledTime({ scheduled_time: "07:00" }, null)).toBe("07:00");
  });

  it("con override, la hora efectiva es la del override — no la habitual", () => {
    expect(effectiveScheduledTime({ scheduled_time: "07:00" }, "19:00")).toBe("19:00");
  });

  it("un hábito sin horario habitual queda 'todo el día' cuando tampoco hay override", () => {
    expect(effectiveScheduledTime({ scheduled_time: null }, undefined)).toBeNull();
  });

  it("resuelve la hora efectiva de cada hábito que toca hoy, usando el override solo del que lo tiene", () => {
    const now = new Date("2026-07-31T15:00:00.000Z"); // 2026-07-31 en BA.
    const conOverride = { id: "h1", ...habit({ frequency_type: "daily" }), scheduled_time: "07:00" };
    const sinOverride = { id: "h2", ...habit({ frequency_type: "daily" }), scheduled_time: "08:00" };
    const noTocaHoy = {
      id: "h3",
      ...habit({ frequency_type: "specific_days", days_of_week: [nativeIsoDow("2026-08-01")] }),
      scheduled_time: "09:00",
    };

    const result = habitsDueTodayWithEffectiveTime(
      [conOverride, sinOverride, noTocaHoy],
      { h1: "19:00" },
      TZ,
      now,
    );

    expect(result.map((h) => h.id)).toEqual(["h1", "h2"]); // h3 no toca hoy, no aparece.
    expect(result.find((h) => h.id === "h1")?.effective_scheduled_time).toBe("19:00");
    expect(result.find((h) => h.id === "h2")?.effective_scheduled_time).toBe("08:00");
  });
});
