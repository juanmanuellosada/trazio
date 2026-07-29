/**
 * Parseo de una hora escrita a mano en el campo de hora del selector de
 * fecha (bloque 5.2): además de elegir de la lista, se puede tipear
 * directamente — "13:47" (24 horas), "1:47pm" / "1:47 p. m." (12 horas, con
 * o sin puntos/espacios), solo la hora ("9", "21") o de corrido sin
 * separador ("1347" -> 13:47).
 *
 * No depende de la preferencia de 12/24 horas de la cuenta: si el texto
 * trae am/pm se interpreta en 12 horas, si no, en 24 — la preferencia solo
 * decide cómo se muestra la hora ya guardada (`date-select.tsx`), nunca
 * cómo se interpreta lo tipeado, para no rechazar una hora válida solo
 * porque no coincide con el formato activo.
 */
export function parseTimeInput(input: string): { hour: number; minute: number } | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  const meridiemMatch = raw.match(/\s*([ap])\.?\s?m\.?\s*$/);
  const meridiem = meridiemMatch ? (meridiemMatch[1] as "a" | "p") : null;
  const body = (meridiemMatch ? raw.slice(0, meridiemMatch.index) : raw).trim();

  const parts = body.split(/[:.\s]+/).filter(Boolean);
  let hour: number;
  let minute: number;

  if (parts.length >= 2 && /^\d{1,2}$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
    hour = Number(parts[0]);
    minute = Number(parts[1]);
  } else if (parts.length === 1 && /^\d{3,4}$/.test(parts[0])) {
    hour = Number(parts[0].slice(0, -2));
    minute = Number(parts[0].slice(-2));
  } else if (parts.length === 1 && /^\d{1,2}$/.test(parts[0])) {
    hour = Number(parts[0]);
    minute = 0;
  } else {
    return null;
  }

  if (minute < 0 || minute > 59) return null;

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === "p" && hour !== 12) hour += 12;
    if (meridiem === "a" && hour === 12) hour = 0;
  } else if (hour < 0 || hour > 23) {
    return null;
  }

  return { hour, minute };
}
