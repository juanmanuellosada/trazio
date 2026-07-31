import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { TimeFormatPreference } from "@/lib/dates/format";
import type { Habit, HabitFrequencyType } from "./habit-columns";

const DAY_NAMES: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
  7: "domingo",
};

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

/** Singular o plural según `n`, sin repetir el condicional en cada lugar que lo necesita. */
export function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

/**
 * Texto de la frecuencia de un hábito para la meta de su tarjeta (tarea
 * 3.4). "Días específicos" lista los días elegidos en orden de semana
 * (lunes primero, ISO 1..7), no en el orden en que se guardaron.
 */
export function formatHabitFrequency(
  habit: Pick<Habit, "frequency_type" | "times_per_week" | "days_of_week">,
): string {
  if (habit.frequency_type === "daily") return "Todos los días";

  if (habit.frequency_type === "times_per_week") {
    const n = habit.times_per_week ?? 0;
    return `${n} ${pluralize(n, "vez", "veces")} por semana`;
  }

  const days = [...(habit.days_of_week ?? [])].sort((a, b) => a - b).map((d) => DAY_NAMES[d]);
  if (days.length === 0) return "Días específicos";
  const joined = days.length === 1 ? days[0] : `${days.slice(0, -1).join(", ")} y ${days[days.length - 1]}`;
  return capitalize(joined);
}

/**
 * Hora efectiva formateada según la preferencia de formato de hora del
 * usuario, o "Todo el día" cuando no hay ninguna (spec "Campos de un
 * hábito"). `effectiveTime` llega como `time` de Postgres ("07:00" o
 * "07:00:00", con segundos que acá se descartan siempre) — sin zona
 * horaria involucrada, a diferencia de `formatTaskDueLabel`
 * (`lib/dates/format.ts`), que sí convierte un instante. Mismos patrones de
 * formato que esa función: "HH:mm" en 24 horas, "h:mm aaaa" en 12.
 */
export function formatHabitTime(effectiveTime: string | null, timeFormat: TimeFormatPreference): string {
  if (!effectiveTime) return "Todo el día";
  if (timeFormat === 24) return effectiveTime.slice(0, 5);
  const [hours, minutes] = effectiveTime.split(":").map(Number);
  return format(new Date(2000, 0, 1, hours, minutes), "h:mm aaaa", { locale: es });
}

export function formatHabitDuration(minutes: number): string {
  return `${minutes} min`;
}

/** Unidad de la racha según el tipo de frecuencia: "N veces por semana" cuenta en semanas (D-C), el resto en días. */
export function streakUnit(frequencyType: HabitFrequencyType): { singular: string; plural: string } {
  return frequencyType === "times_per_week" ? { singular: "semana", plural: "semanas" } : { singular: "día", plural: "días" };
}

export function formatStreak(value: number, frequencyType: HabitFrequencyType): string {
  const unit = streakUnit(frequencyType);
  return `${value} ${pluralize(value, unit.singular, unit.plural)}`;
}
