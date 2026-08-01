import { addDays, addMonths, addWeeks, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { CalendarFormat } from "./block";

/**
 * Navegación del calendario (grupo 7, "montar `CalendarView`"): `CalendarView`
 * solo dibuja el rango que se le pasa (D-E), nunca decide cuál es — esto es
 * lo que mueve `anchorDate` un paso atrás o adelante, con la unidad de paso
 * del formato activo, para que las flechas avancen lo mismo que se ve.
 */

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function shiftAnchorDate(calendarFormat: CalendarFormat, anchorDate: string, direction: 1 | -1): string {
  const date = parseISO(anchorDate);
  switch (calendarFormat) {
    case "dia":
      return format(addDays(date, direction), "yyyy-MM-dd");
    case "cuatro-dias":
      return format(addDays(date, direction * 4), "yyyy-MM-dd");
    case "semana":
      return format(addWeeks(date, direction), "yyyy-MM-dd");
    case "mes":
      return format(addMonths(date, direction), "yyyy-MM-dd");
  }
}

/** Rótulo del rango visible, sentence case (`.claude/rules/copy.md`): día y mes se leen del ancla; los formatos de varios días muestran el primero y el último de `visibleDays`. */
export function calendarRangeLabel(calendarFormat: CalendarFormat, anchorDate: string, visibleDays: string[]): string {
  const anchor = parseISO(anchorDate);
  if (calendarFormat === "dia") {
    return capitalize(format(anchor, "EEEE d 'de' MMMM", { locale: es }));
  }
  if (calendarFormat === "mes") {
    return capitalize(format(anchor, "MMMM yyyy", { locale: es }));
  }

  const first = visibleDays[0];
  const last = visibleDays[visibleDays.length - 1];
  if (!first || !last) return "";
  const firstDate = parseISO(first);
  const lastDate = parseISO(last);
  const sameMonth = format(firstDate, "MM-yyyy") === format(lastDate, "MM-yyyy");
  const firstLabel = format(firstDate, sameMonth ? "d" : "d 'de' MMMM", { locale: es });
  const lastLabel = format(lastDate, "d 'de' MMMM", { locale: es });
  return capitalize(`${firstLabel} – ${lastLabel}`);
}
