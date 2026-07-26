import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Aritmética de calendario del parser (bloque 9). Todo acá opera sobre
 * `Date.UTC`/getters `UTC*` a propósito, nunca sobre getters locales: un
 * `Date` construido con getters locales cambia de valor según el huso del
 * proceso que corre el test, que es justo lo que E1 prohíbe que el parser
 * dependa. `today()` es el único lugar que cruza a una zona horaria real
 * (vía `date-fns-tz`, que no depende del huso del sistema — verificado
 * corriendo con `TZ` distinto antes de escribir este archivo).
 */
export type CalendarDate = { y: number; m: number; d: number }; // m: 1-12

const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const;

export function weekdayIndex(nombreNormalizado: string): number {
  return WEEKDAY_NAMES.indexOf(nombreNormalizado as (typeof WEEKDAY_NAMES)[number]);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "Hoy" del usuario: la fecha de calendario que corresponde a `ahora` en `zonaHoraria`. */
export function today(ahora: Date, zonaHoraria: string): CalendarDate {
  const [y, m, d] = formatInTimeZone(ahora, zonaHoraria, "yyyy-MM-dd").split("-").map(Number);
  return { y, m, d };
}

function toUTCDate(cd: CalendarDate): Date {
  return new Date(Date.UTC(cd.y, cd.m - 1, cd.d));
}

function fromUTCDate(date: Date): CalendarDate {
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

export function addDays(cd: CalendarDate, days: number): CalendarDate {
  const date = toUTCDate(cd);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUTCDate(date);
}

export function addMonths(cd: CalendarDate, months: number): CalendarDate {
  const date = toUTCDate(cd);
  date.setUTCMonth(date.getUTCMonth() + months);
  return fromUTCDate(date);
}

export function addYears(cd: CalendarDate, years: number): CalendarDate {
  return addMonths(cd, years * 12);
}

export function dayOfWeek(cd: CalendarDate): number {
  return toUTCDate(cd).getUTCDay();
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return toUTCDate(a).getTime() - toUTCDate(b).getTime();
}

export function formatDate(cd: CalendarDate): string {
  return `${cd.y}-${pad(cd.m)}-${pad(cd.d)}`;
}

/**
 * Próxima fecha en la que cae `targetDow` (0 domingo … 6 sábado). Con
 * `includeToday: false` nunca resuelve a hoy, aunque hoy ya sea ese día
 * (R10/E16: "lunes" dicho un lunes es hoy+7, nunca hoy).
 */
export function nextWeekday(cd: CalendarDate, targetDow: number, includeToday: boolean): CalendarDate {
  const current = dayOfWeek(cd);
  let diff = (targetDow - current + 7) % 7;
  if (diff === 0 && !includeToday) diff = 7;
  return addDays(cd, diff);
}

/** Primer día de la semana que contiene `cd`, según `weekStartsOn` (0/1/6). */
export function startOfWeek(cd: CalendarDate, weekStartsOn: number): CalendarDate {
  const current = dayOfWeek(cd);
  const diff = (current - weekStartsOn + 7) % 7;
  return addDays(cd, -diff);
}

/** "Próxima semana" (R9/E15): el primer día de la semana siguiente según `weekStartsOn`, no un lunes fijo. */
export function nextWeekStart(cd: CalendarDate, weekStartsOn: number): CalendarDate {
  return addDays(startOfWeek(cd, weekStartsOn), 7);
}

/** Próxima ocurrencia de una fecha puntual sin año: si ya pasó este año (o es anterior a hoy), el año siguiente (R2). */
export function nextOccurrenceOfMonthDay(hoy: CalendarDate, month: number, day: number): CalendarDate {
  const candidate: CalendarDate = { y: hoy.y, m: month, d: day };
  return compareDates(candidate, hoy) >= 0 ? candidate : { y: hoy.y + 1, m: month, d: day };
}

/** Año de dos dígitos: siempre `20YY`, sin pivote de siglo (E8). */
export function resolveTwoDigitYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

/** Combina una fecha de calendario con una hora local y devuelve el instante UTC equivalente, en ISO 8601. */
export function toDueAt(cd: CalendarDate, hour: number, minute: number, zonaHoraria: string): string {
  const local = `${cd.y}-${pad(cd.m)}-${pad(cd.d)}T${pad(hour)}:${pad(minute)}:00`;
  return fromZonedTime(local, zonaHoraria).toISOString();
}

export { WEEKDAY_NAMES };
