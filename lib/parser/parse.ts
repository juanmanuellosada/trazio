import { today } from "./dates";
import { normalize } from "./normalize";
import {
  recognizeDuration,
  recognizeHour,
  recognizePointDate,
  recognizeRecurrence,
  recognizeRelativeDate,
  recognizeSymbols,
  recognizeWeekdayLoose,
} from "./recognizers";
import { resolveCandidates } from "./resolve";
import type { ParserContext, ParseResult } from "./types";

const EMPTY_RESULT_OF = (title: string): ParseResult => ({
  title,
  dueDate: null,
  dueAt: null,
  durationMinutes: null,
  priority: null,
  recurrenceRule: null,
  labels: [],
  project: null,
  matches: [],
});

/**
 * El parser de lenguaje natural del alta rápida (bloque 9). Función pura
 * (E1 del design): todo lo que necesita viaja en `contexto`, nunca lee
 * `Date.now()` ni el `Intl` del sistema — es lo que hace determinista cada
 * test y lo que resuelve "mañana a las 10" en la zona horaria del usuario,
 * no en la del servidor.
 *
 * Nunca tira una excepción (E2): ante cualquier entrada, el peor resultado
 * es el texto entero como título, sin atributos. Corre en el cliente en
 * cada tecla con debounce de 120 ms (ver `use-parser-context.ts` y
 * `task-quick-add-row.tsx`), así que tiene que ser rápido y no puede romper
 * la interfaz con texto a medio escribir.
 */
export function parse(texto: string, contexto: ParserContext): ParseResult {
  try {
    if (typeof texto !== "string") return EMPTY_RESULT_OF(String(texto ?? ""));
    return parseInternal(texto, contexto);
  } catch {
    return EMPTY_RESULT_OF(texto ?? "");
  }
}

function parseInternal(texto: string, ctx: ParserContext): ParseResult {
  const normalized = normalize(texto);
  const hoy = today(ctx.ahora, ctx.zonaHoraria);

  const candidates = [
    ...recognizeRelativeDate(normalized, hoy, ctx.semanaEmpiezaEn),
    ...recognizePointDate(normalized, hoy),
    ...recognizeWeekdayLoose(normalized, hoy),
    ...recognizeHour(normalized),
    ...recognizeDuration(normalized),
    ...recognizeRecurrence(normalized),
    ...recognizeSymbols(texto, normalized, ctx),
  ];

  return resolveCandidates(texto, candidates, { hoy, zonaHoraria: ctx.zonaHoraria });
}
