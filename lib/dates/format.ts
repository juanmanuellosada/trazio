import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { taskDueDay, todayInTimeZone, type TaskDueFields } from "./today";

export type DateFormatPreference = "dd/MM/yyyy" | "yyyy-MM-dd";
export type TimeFormatPreference = 12 | 24;

const NUMERIC_PATTERN: Record<DateFormatPreference, string> = {
  "dd/MM/yyyy": "dd/MM/yyyy",
  "yyyy-MM-dd": "yyyy-MM-dd",
};

export type DateFormatPreferences = {
  now: Date;
  timezone: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
};

/**
 * Fecha de vencimiento en lenguaje natural cuando falta menos de una semana
 * ("hoy", "mañana", "el martes"), y en formato numérico según la
 * preferencia del usuario a partir de ahí (requirement "Fechas en lenguaje
 * natural en las vistas de lista", 8.7 de `tasks.md`). La diferencia en
 * días se calcula sobre el día calendario ya resuelto en la zona del
 * usuario (`taskDueDay`), nunca sobre el instante UTC crudo.
 *
 * Solo se usa lenguaje natural hacia adelante: una fecha vencida (diferencia
 * negativa) siempre se muestra en formato numérico, para no dejar ambiguo
 * si "el martes" fue el pasado o es el próximo — el bloque "Atrasadas" de
 * la vista Hoy ya deja claro que está vencida, no hace falta que la fecha
 * también lo intente decir con una palabra ambigua.
 */
export function formatTaskDueLabel(task: TaskDueFields, preferences: DateFormatPreferences): string | null {
  const due = taskDueDay(task, preferences.timezone);
  if (!due) return null;

  const today = todayInTimeZone(preferences.now, preferences.timezone);
  const diff = differenceInCalendarDays(parseISO(due), parseISO(today));

  let datePart: string;
  if (diff === 0) {
    datePart = "hoy";
  } else if (diff === 1) {
    datePart = "mañana";
  } else if (diff >= 2 && diff <= 6) {
    datePart = `el ${format(parseISO(due), "EEEE", { locale: es })}`;
  } else {
    datePart = format(parseISO(due), NUMERIC_PATTERN[preferences.dateFormat]);
  }

  if (!task.due_at) return datePart;

  const timePart = formatInTimeZone(task.due_at, preferences.timezone, preferences.timeFormat === 24 ? "HH:mm" : "h:mm aaaa", {
    locale: es,
  });
  return `${datePart} · ${timePart}`;
}
