import { nextWeekday, toDueAt, type CalendarDate } from "./dates";
import type { Candidate } from "./recognizers";
import type { ParseMatch, ParseResult } from "./types";

/**
 * Fase de resolución (E3): recibe todos los candidatos ya producidos por los
 * reconocedores, independientes entre sí, y decide quién gana. Solo acá se
 * aplican R4 (día suelto, último recurso) y R5 (primera en el texto), y
 * recién con los ganadores decididos se remueven sus rangos del título — los
 * candidatos perdedores no se tocan ni se resaltan (E9).
 */

type DateCandidate = Extract<Candidate, { attr: "date" }>;
type HourCandidate = Extract<Candidate, { attr: "hour" }>;
type DurationCandidate = Extract<Candidate, { attr: "duration" }>;
type RecurrenceCandidate = Extract<Candidate, { attr: "recurrence" }>;
type PriorityCandidate = Extract<Candidate, { attr: "priority" }>;
type LabelCandidate = Extract<Candidate, { attr: "label" }>;
type ProjectCandidate = Extract<Candidate, { attr: "project" }>;

/** R5: gana el candidato que aparece primero en el texto, de izquierda a derecha — no el orden de ejecución interno. */
function firstByStart<T extends { start: number }>(candidates: T[]): T | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((first, current) => (current.start < first.start ? current : first));
}

export function resolveCandidates(
  text: string,
  candidates: Candidate[],
  ctx: { hoy: CalendarDate; zonaHoraria: string },
): ParseResult {
  const dateCandidates = candidates.filter((c): c is DateCandidate => c.attr === "date");
  const nonWeekdayLoose = dateCandidates.filter((c) => c.kind !== "weekday-loose");
  // R4: el día suelto es último recurso — si ya hay otra fecha reconocida en cualquier parte del texto, se descarta entero.
  const eligibleDates = nonWeekdayLoose.length > 0 ? nonWeekdayLoose : dateCandidates;
  const winningDate = firstByStart(eligibleDates);

  const winningHour = firstByStart(candidates.filter((c): c is HourCandidate => c.attr === "hour"));
  const winningDuration = firstByStart(candidates.filter((c): c is DurationCandidate => c.attr === "duration"));
  const winningRecurrence = firstByStart(candidates.filter((c): c is RecurrenceCandidate => c.attr === "recurrence"));
  const winningPriority = firstByStart(candidates.filter((c): c is PriorityCandidate => c.attr === "priority"));
  const winningProject = firstByStart(candidates.filter((c): c is ProjectCandidate => c.attr === "project"));
  // Las etiquetas son multivaluadas: exentas de R5 (E6, caso 43).
  const labelCandidates = candidates.filter((c): c is LabelCandidate => c.attr === "label");

  let dueDate: string | null = null;
  let dueAt: string | null = null;

  if (winningDate && winningHour) {
    dueAt = toDueAt(winningDate.date, winningHour.hour, winningHour.minute, ctx.zonaHoraria);
  } else if (winningHour && winningRecurrence && !winningDate) {
    // E12: recurrencia + hora, sin fecha explícita → el ancla es la próxima ocurrencia de la regla, no "hoy".
    const anchor =
      winningRecurrence.anchorWeekday != null ? nextWeekday(ctx.hoy, winningRecurrence.anchorWeekday, false) : ctx.hoy;
    dueAt = toDueAt(anchor, winningHour.hour, winningHour.minute, ctx.zonaHoraria);
  } else if (winningHour && !winningDate) {
    dueAt = toDueAt(ctx.hoy, winningHour.hour, winningHour.minute, ctx.zonaHoraria);
  } else if (winningDate) {
    dueDate = `${winningDate.date.y}-${String(winningDate.date.m).padStart(2, "0")}-${String(winningDate.date.d).padStart(2, "0")}`;
  }

  const winners: Candidate[] = [
    ...(winningDate ? [winningDate as Candidate] : []),
    ...(winningHour ? [winningHour as Candidate] : []),
    ...(winningDuration ? [winningDuration as Candidate] : []),
    ...(winningRecurrence ? [winningRecurrence as Candidate] : []),
    ...(winningPriority ? [winningPriority as Candidate] : []),
    ...(winningProject ? [winningProject as Candidate] : []),
    ...labelCandidates,
  ];

  const matches: ParseMatch[] = winners
    .map((w) => ({ start: w.start, end: w.end, attr: w.attr }))
    .sort((a, b) => a.start - b.start);

  return {
    title: buildTitle(text, matches),
    dueDate,
    dueAt,
    durationMinutes: winningDuration?.minutes ?? null,
    priority: winningPriority?.value ?? null,
    recurrenceRule: winningRecurrence?.rrule ?? null,
    labels: labelCandidates.map((c) => ({ id: c.id, name: c.name })),
    project: winningProject
      ? {
          id: winningProject.id,
          name: winningProject.name,
          section: winningProject.sectionId
            ? { id: winningProject.sectionId, name: winningProject.sectionName! }
            : null,
        }
      : null,
    matches,
  };
}

/**
 * Remueve del texto los rangos ganadores y normaliza los espacios que deja
 * el hueco (secuencias de espacio colapsan a uno, se recortan los
 * extremos) — pero un artículo huérfano que no formaba parte de ningún
 * rango removido queda exactamente donde estaba (R8/E4, casos 14 y 21).
 */
export function buildTitle(text: string, matches: ParseMatch[]): string {
  let result = "";
  let cursor = 0;
  for (const match of matches) {
    result += text.slice(cursor, match.start);
    cursor = match.end;
  }
  result += text.slice(cursor);
  return result.replace(/\s+/g, " ").trim();
}
