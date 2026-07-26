import { buildTitle } from "./resolve";
import type { ParseMatch, ParseResult } from "./types";

/** Clave estable de un match para el conjunto de resaltados desactivados (R7, bloque 9.20-9.22). */
export function matchKey(match: Pick<ParseMatch, "attr" | "start" | "end">): string {
  return `${match.attr}:${match.start}:${match.end}`;
}

/**
 * Aplica los resaltados que el usuario desactivó con doble clic (R7): el
 * token desactivado vuelve a ser texto común (no se remueve del título) y
 * su atributo se descarta. `due_at` nace de combinar una fecha —o una
 * recurrencia, E12— con una hora: desactivar cualquiera de las dos partes
 * descarta el valor combinado entero, porque una hora sin la fecha que la
 * ancla (o al revés) deja de tener sentido como valor único.
 */
export function applyDisabledMatches(rawText: string, result: ParseResult, disabledKeys: Set<string>): ParseResult {
  const isDisabled = (m: ParseMatch) => disabledKeys.has(matchKey(m));
  const active = result.matches.filter((m) => !isDisabled(m));

  const dateDisabled = result.matches.some((m) => m.attr === "date" && isDisabled(m));
  const hourDisabled = result.matches.some((m) => m.attr === "hour" && isDisabled(m));
  const recurrenceDisabled = result.matches.some((m) => m.attr === "recurrence" && isDisabled(m));
  const durationDisabled = result.matches.some((m) => m.attr === "duration" && isDisabled(m));
  const priorityDisabled = result.matches.some((m) => m.attr === "priority" && isDisabled(m));
  const projectDisabled = result.matches.some((m) => m.attr === "project" && isDisabled(m));

  const dueAtDisabled = result.dueAt != null && (dateDisabled || hourDisabled || recurrenceDisabled);
  const dueDateDisabled = result.dueDate != null && dateDisabled;

  // Las etiquetas están exentas de R5 (E6): pueden ser varias. `result.labels`
  // y los matches de atributo "label" se construyen en el mismo orden de
  // aparición en el texto (ver `resolve.ts`), así que se pueden emparejar por índice.
  const labelMatches = result.matches.filter((m) => m.attr === "label");

  return {
    title: buildTitle(rawText, active),
    dueDate: dueDateDisabled ? null : result.dueDate,
    dueAt: dueAtDisabled ? null : result.dueAt,
    durationMinutes: durationDisabled ? null : result.durationMinutes,
    priority: priorityDisabled ? null : result.priority,
    recurrenceRule: recurrenceDisabled ? null : result.recurrenceRule,
    project: projectDisabled ? null : result.project,
    labels: result.labels.filter((_, i) => !isDisabled(labelMatches[i])),
    matches: active,
  };
}
