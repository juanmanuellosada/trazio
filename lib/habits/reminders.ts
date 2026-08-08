import { parseHHMM, formatTimeValue } from "@/components/selectors/time-field";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";

/**
 * Opciones de recordatorio de un hábito (tarea 5.1, spec
 * `recordatorios-de-habitos` "Un hábito puede tener varios recordatorios,
 * todos relativos a su hora"): siempre relativas a la hora del hábito, sin
 * ningún puntual — a diferencia de una tarea, un hábito se repite, así que
 * un instante fijo solo tendría sentido el primer día. No reusa
 * `RELATIVE_REMINDER_OPTIONS` (`lib/reminders/relative-options.ts`) tal
 * cual: esa lista tiene días y "una semana antes", que no aplican acá — un
 * desfase de un día entero contra la hora de un hábito diario caería en
 * "el día anterior", una noción que ni el spec ni el diseño contemplan.
 */
export type HabitReminderOption = { offsetMinutes: number; label: string };

const OFFSETS = [0, -10, -15, -30, -45, -60, -120, -180] as const;

/** "10 minutos" / "1 hora" / "3 horas" a partir del desfase (siempre negativo o cero acá). */
function cantidadYUnidad(offsetMinutes: number): string {
  const abs = Math.abs(offsetMinutes);
  if (abs % 60 === 0) {
    const horas = abs / 60;
    return `${horas} ${horas === 1 ? "hora" : "horas"}`;
  }
  return `${abs} minutos`;
}

/**
 * Las opciones para un hábito con hora programada, mismo estilo que
 * `RELATIVE_REMINDER_OPTIONS` de tareas: "antes" sin nombrar la hora, que
 * ya es la del hábito. Uso interno: `habitReminderOptions` es la función
 * que ve la interfaz, porque decide entre esta lista y la de un hábito
 * "todo el día" según corresponda (tarea 5.2).
 */
const FIXED_OPTIONS: HabitReminderOption[] = OFFSETS.map((offsetMinutes) => ({
  offsetMinutes,
  label: offsetMinutes === 0 ? "A la hora del hábito" : `${cantidadYUnidad(offsetMinutes)} antes`,
}));

/**
 * Opciones de recordatorio para un hábito, con el texto ajustado según
 * tenga hora programada o no (tarea 5.2, spec "Un hábito sin hora explica
 * contra qué se calcula"): un hábito "todo el día" no tiene una hora propia
 * contra la cual "antes" signifique algo, así que cada opción nombra
 * explícitamente la hora de referencia del usuario en vez de dejarlo
 * implícito.
 */
export function habitReminderOptions(
  hasScheduledTime: boolean,
  referenceTime: string,
  timeFormat: UserPreferences["timeFormat"],
): HabitReminderOption[] {
  if (hasScheduledTime) return FIXED_OPTIONS;

  const hora = formatTimeValue(parseHHMM(referenceTime.slice(0, 5)), timeFormat);
  return OFFSETS.map((offsetMinutes) => ({
    offsetMinutes,
    label:
      offsetMinutes === 0
        ? `A la hora de referencia (${hora})`
        : `${cantidadYUnidad(offsetMinutes)} antes de las ${hora} (hora de referencia)`,
  }));
}

/** Etiqueta de un desfase ya guardado (lista de recordatorios de un hábito), mismo criterio que `habitReminderOptions`. */
export function habitReminderOffsetLabel(
  offsetMinutes: number,
  hasScheduledTime: boolean,
  referenceTime: string,
  timeFormat: UserPreferences["timeFormat"],
): string {
  const options = habitReminderOptions(hasScheduledTime, referenceTime, timeFormat);
  const found = options.find((option) => option.offsetMinutes === offsetMinutes);
  return found?.label ?? `${offsetMinutes} min`;
}
