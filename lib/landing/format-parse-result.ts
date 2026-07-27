import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import type { ParseResult } from "@/lib/parser/types";
import { LANDING_ZONE } from "./demo-context";

/** Formatea `duration_minutes` como lo vería el usuario ("1h 30min", "45 min", "2h"). */
export function formatDuration(minutes: number): string {
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

/** Formatea `dueAt`/`dueDate` en lenguaje natural, en la zona horaria de la demo. */
export function formatWhen(result: ParseResult): string | null {
  if (result.dueAt) {
    return formatInTimeZone(result.dueAt, LANDING_ZONE, "EEEE d 'de' MMMM, HH:mm'hs'", { locale: es });
  }
  if (result.dueDate) {
    const [y, m, d] = result.dueDate.split("-").map(Number);
    return format(new Date(y, m - 1, d), "EEEE d 'de' MMMM", { locale: es });
  }
  return null;
}
