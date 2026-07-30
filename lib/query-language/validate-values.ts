/**
 * Validación semántica de valores del lenguaje de consulta (bloque 2.5):
 * funciones puras que `parse.ts` llama al construir cada nodo de campo, para
 * no mezclar "esto no es sintácticamente un token" (tokenize.ts) con "esto
 * es un token válido pero un valor imposible" (acá) — por ejemplo
 * `priority:5` o una fecha con formato equivocado.
 */

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidPriorityValue(value: string): boolean {
  return /^[1-4]$/.test(value);
}

export function isValidBooleanValue(value: string): value is "true" | "false" {
  return value === "true" || value === "false";
}

export const DUE_KEYWORD_SET = new Set(["today", "tomorrow", "overdue", "nodate", "next7days", "next30days"]);

export function isDueKeyword(value: string): boolean {
  return DUE_KEYWORD_SET.has(value);
}
