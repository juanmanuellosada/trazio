import { createClient } from "@/lib/supabase/server";
import type { DateFormatPreference, TimeFormatPreference } from "@/lib/dates/format";

export type UserPreferences = {
  timezone: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  weekStartsOn: 0 | 1 | 6;
  /** Proyecto destino cuando el alta no tiene contexto propio (D-B de `alta-de-tareas-en-contexto`): existe en la base desde fase 1 y hasta acá no se leía. `null` sin uno configurado, caso en el que la cadena de destino sigue a Bandeja de entrada. */
  defaultProjectId: string | null;
  /** Interruptor de `sonido-al-completar` (D-D): opcional para no forzar a los fixtures de test que construyen `UserPreferences` a mano a declararlo. `undefined` se trata igual que `true`, que es el default de la columna. */
  soundOnComplete?: boolean;
  /** Hora de referencia (`recordatorios-con-hora-de-referencia`, D-A): a qué hora se considera que vence una tarea con día pero sin hora. Hora de reloj (`"HH:mm:ss"`), no instante. Opcional por el mismo motivo que `soundOnComplete`: no forzar a los fixtures de test a declararla. `undefined` se trata igual que `"09:00:00"`, el default de la columna. */
  referenceTime?: string;
};

/** Mismos defaults que B4 del design de fase 1, para el caso sin fila todavía (no debería pasar tras el aprovisionamiento, pero evita reventar la vista). */
const DEFAULT_PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
  soundOnComplete: true,
  referenceTime: "09:00:00",
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
    .select("timezone, date_format, time_format, week_starts_on, default_project_id, sound_on_complete, reference_time")
    .eq("user_id", userId)
    .single();

  if (!data) return DEFAULT_PREFERENCES;

  return {
    timezone: data.timezone,
    dateFormat: data.date_format as DateFormatPreference,
    timeFormat: data.time_format as TimeFormatPreference,
    weekStartsOn: data.week_starts_on as UserPreferences["weekStartsOn"],
    defaultProjectId: data.default_project_id,
    soundOnComplete: data.sound_on_complete,
    referenceTime: data.reference_time,
  };
}
