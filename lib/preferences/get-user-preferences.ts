import { createClient } from "@/lib/supabase/server";
import type { DateFormatPreference, TimeFormatPreference } from "@/lib/dates/format";

export type UserPreferences = {
  timezone: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  weekStartsOn: 0 | 1 | 6;
  /** Proyecto destino cuando el alta no tiene contexto propio (D-B de `alta-de-tareas-en-contexto`): existe en la base desde fase 1 y hasta acá no se leía. `null` sin uno configurado, caso en el que la cadena de destino sigue a Bandeja de entrada. */
  defaultProjectId: string | null;
};

/** Mismos defaults que B4 del design de fase 1, para el caso sin fila todavía (no debería pasar tras el aprovisionamiento, pero evita reventar la vista). */
const DEFAULT_PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

/**
 * Preferencias de fecha/hora del usuario (bloque 8.7 y el requirement "El
 * día actual se calcula en la zona horaria del usuario"): un solo lugar que
 * lee `user_preferences`, para que el contador de Hoy, las cuatro vistas y
 * el formato de fecha en lenguaje natural usen siempre la misma zona.
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("timezone, date_format, time_format, week_starts_on, default_project_id")
    .eq("user_id", userId)
    .single();

  if (!data) return DEFAULT_PREFERENCES;

  return {
    timezone: data.timezone,
    dateFormat: data.date_format as DateFormatPreference,
    timeFormat: data.time_format as TimeFormatPreference,
    weekStartsOn: data.week_starts_on as UserPreferences["weekStartsOn"],
    defaultProjectId: data.default_project_id,
  };
}
