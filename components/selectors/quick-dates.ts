import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { parse } from "@/lib/parser/parse";
import type { ParserContext } from "@/lib/parser/types";

export type QuickDateOption = {
  key: "hoy" | "manana" | "finde" | "proxima-semana";
  label: string;
  /** `yyyy-MM-dd`. */
  date: string;
  /** Día concreto al que corresponde, para mostrar junto al nombre del acceso rápido (bloque 4.3). */
  dayLabel: string;
};

const QUICK_DATE_PHRASES: { key: QuickDateOption["key"]; label: string; phrase: string }[] = [
  { key: "hoy", label: "Hoy", phrase: "hoy" },
  { key: "manana", label: "Mañana", phrase: "mañana" },
  { key: "finde", label: "Este fin de semana", phrase: "este fin de semana" },
  { key: "proxima-semana", label: "Próxima semana", phrase: "próxima semana" },
];

/**
 * Accesos rápidos del selector de fecha (bloque 4.3): cada fecha sale de
 * llamarle al parser compartido la frase canónica correspondiente ("hoy",
 * "mañana", "este fin de semana", "próxima semana"), nunca de una cuenta de
 * días propia — así el acceso rápido siempre coincide con lo que el mismo
 * texto resolvería si se escribiera a mano en el campo de lenguaje natural.
 */
export function getQuickDateOptions(ahora: Date, ctx: Omit<ParserContext, "ahora">): QuickDateOption[] {
  return QUICK_DATE_PHRASES.map(({ key, label, phrase }) => {
    const resultado = parse(phrase, { ahora, ...ctx });
    const date = resultado.dueDate as string; // las cuatro frases canónicas siempre resuelven a una fecha pura
    return { key, label, date, dayLabel: format(parseISO(date), "EEE d/M", { locale: es }) };
  });
}
