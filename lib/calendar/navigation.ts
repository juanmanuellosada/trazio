import { addDays, addMonths, addWeeks, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { CalendarFormat } from "./block";

/**
 * Navegación del calendario (grupo 7, "montar `CalendarView`"): `CalendarView`
 * solo dibuja el rango que se le pasa (D-E), nunca decide cuál es — esto es
 * lo que mueve `anchorDate` un paso atrás o adelante, con la unidad de paso
 * del formato activo, para que las flechas avancen lo mismo que se ve.
 *
 * Tarea 6.2 (`design.md` decisión 5): en los formatos día/cuatro días/semana
 * `anchorDate` dejó de ser un ancla alineada a un rango fijo (grupo 3,
 * `continuousVisibleDays`) — es simplemente el primer día visible, y correr
 * "una pantalla" sigue siendo sumar o restar la misma cantidad de días de
 * siempre (`addDays`/`addWeeks` no le exigían alineación a nada, así que
 * esto no necesitó cambiar). El desplazamiento suave que pide 6.2 lo hace
 * `use-continuous-scroll.ts` al recibir el `anchorDate` nuevo, no esta
 * función. Formato mes sigue aparte, sin desplazamiento continuo.
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

/** Cuánto corren anterior/siguiente en cada formato (tarea 6.4, "dejar claro en la barra de navegación qué hacen los botones"): texto para el `aria-label` de esos dos botones, distinto por formato en vez de un genérico "Período" que no dice si corre un día o un mes. */
export function navigationStepLabel(calendarFormat: CalendarFormat): string {
  switch (calendarFormat) {
    case "dia":
      return "un día";
    case "cuatro-dias":
      return "cuatro días";
    case "semana":
      return "una semana";
    case "mes":
      return "un mes";
  }
}

/** Rótulo del rango visible, sentence case (`.claude/rules/copy.md`): día y mes se leen del ancla; los formatos de varios días muestran el primero y el último de `visibleDays`, sin asumir que el tramo está alineado a un inicio de semana (tarea 6.5). */
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
