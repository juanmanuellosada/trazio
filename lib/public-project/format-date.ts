import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Fecha en lenguaje natural para la vista pública, sin depender de la zona
 * horaria de nadie. `due_date`/`deadline` son `date` ("2026-09-01") y
 * `due_at` es `timestamptz` ("2026-09-01T14:00:00+00:00") — los primeros 10
 * caracteres son la fecha calendario en los dos casos. A propósito no se
 * muestra la hora de `due_at`: convertirla a un horario legible exige la
 * zona horaria del dueño (`user_preferences.timezone`), y esa es
 * exactamente el tipo de dato de cuenta que D-E prohíbe publicar — mostrar
 * solo el día evita tener que elegir entre filtrarla o mentir con la hora
 * en UTC.
 */
export function formatSharedDate(value: string): string {
  return format(parseISO(value.slice(0, 10)), "d 'de' MMMM 'de' yyyy", { locale: es });
}
