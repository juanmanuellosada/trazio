/**
 * Duración estimada del selector de fecha (bloque 5.3): el modelo sigue
 * guardando siempre minutos enteros en `duration_minutes` — la unidad
 * (minutos u horas) es una decisión de cómo se escribe y se lee, nunca de
 * qué se guarda. Estas funciones son las únicas que convierten entre las
 * dos representaciones, para que `date-select.tsx` nunca haga la cuenta a
 * mano ni duplique la lógica.
 */
export type DurationUnit = "minutos" | "horas";

export const DURATION_QUICK_OPTIONS: { label: string; minutes: number }[] = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 h", minutes: 60 },
  { label: "2 h", minutes: 120 },
];

function minutesToUnitText(minutes: number, unit: DurationUnit): string {
  if (unit === "horas") {
    return String(Math.round((minutes / 60) * 100) / 100);
  }
  return String(minutes);
}

/** Minutos guardados -> unidad y texto para mostrar, eligiendo horas cuando el valor es un múltiplo exacto de 60 (más legible que "120 min"). */
export function deriveDurationDisplay(minutes: number | null): { unit: DurationUnit; text: string } {
  if (minutes == null) return { unit: "minutos", text: "" };
  const unit: DurationUnit = minutes >= 60 && minutes % 60 === 0 ? "horas" : "minutos";
  return { unit, text: minutesToUnitText(minutes, unit) };
}

/** Texto escrito en una unidad -> minutos enteros a guardar, o `null` si está vacío o no es un número positivo. */
export function durationTextToMinutes(text: string, unit: DurationUnit): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(unit === "horas" ? value * 60 : value);
}

/** Cambiar de unidad muestra el mismo valor tipeado convertido a la unidad elegida, sin tocar `duration_minutes`. */
export function convertDurationDraft(text: string, fromUnit: DurationUnit, toUnit: DurationUnit): string {
  const minutes = durationTextToMinutes(text, fromUnit);
  if (minutes == null) return text;
  return minutesToUnitText(minutes, toUnit);
}
